import Link from "next/link";
import { PresaleCampaignIntentStatus } from "@prisma/client";
import { updatePresaleCampaignIntentStatus } from "@/lib/presale-campaign-actions";
import { PRESALE_INTENT_STATUS_LABELS } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { USER_PERSONA_LABELS } from "@/lib/persona";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function contactText(intent: { phone?: string | null; email?: string | null; wechat?: string | null }) {
  return [intent.phone && `手机 ${intent.phone}`, intent.email && `邮箱 ${intent.email}`, intent.wechat && `微信 ${intent.wechat}`].filter(Boolean).join(" / ") || "未填写联系方式";
}

function summaryCard(label: string, value: number, hint: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/45">{hint}</p>
    </div>
  );
}

export default async function AdminPresaleIntentsPage() {
  const intents = await prisma.presaleCampaignIntent.findMany({
    include: {
      campaign: true,
      work: true,
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const submittedCount = intents.filter((intent) => intent.status === PresaleCampaignIntentStatus.SUBMITTED).length;
  const contactedCount = intents.filter((intent) => intent.status === PresaleCampaignIntentStatus.CONTACTED).length;
  const withContactCount = intents.filter((intent) => intent.phone || intent.email || intent.wechat).length;
  const totalQuantity = intents.reduce((sum, intent) => sum + intent.quantity, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预售意向管理</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">这里展示用户和买手对作品的预售兴趣。当前阶段不收款，只用于判断作品市场需求。</p>
        </div>
        <Link href="/admin/presale-campaigns" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          返回预售活动
        </Link>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCard("待跟进意向", submittedCount, "尚未联系或确认的意向")}
        {summaryCard("已联系意向", contactedCount, "运营已经开始跟进")}
        {summaryCard("有联系方式", withContactCount, "可直接联系的提交记录")}
        {summaryCard("意向数量合计", totalQuantity, "用户提交的预估数量")}
      </section>

      <section className="space-y-3">
        {intents.length ? intents.map((intent) => (
          <article key={intent.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PRESALE_INTENT_STATUS_LABELS[intent.status]}</span>
                  {intent.source ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">来源：{intent.source}</span> : null}
                  {intent.user ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{USER_PERSONA_LABELS[intent.user.persona]}</span> : null}
                </div>
                <h2 className="mt-3 font-semibold text-ink">{intent.campaign.title}</h2>
                <p className="mt-1 text-sm text-ink/52">作品：{intent.work.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">
                  提交人：{intent.name ?? intent.user?.nickname ?? "匿名用户"} / {contactText(intent)}
                </p>
                <p className="text-sm leading-6 text-ink/58">
                  {[intent.size && `尺码 ${intent.size}`, intent.color && `颜色 ${intent.color}`, `意向数量 ${intent.quantity}`, intent.campaign.estimatedPrice && `预计价格 ${intent.campaign.estimatedPrice}`, intent.note && `备注 ${intent.note}`].filter(Boolean).join(" / ")}
                </p>
                <p className="mt-1 text-xs text-ink/40">提交时间：{formatDate(intent.createdAt)}</p>
              </div>
              <form action={updatePresaleCampaignIntentStatus} className="flex gap-2">
                <input type="hidden" name="id" value={intent.id} />
                <select name="status" defaultValue={intent.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                  {Object.values(PresaleCampaignIntentStatus).map((status) => (
                    <option key={status} value={status}>
                      {PRESALE_INTENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">更新</button>
              </form>
            </div>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预售意向。</div>}
      </section>
    </div>
  );
}
