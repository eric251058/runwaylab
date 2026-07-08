import Link from "next/link";
import { PresaleCampaignIntentStatus } from "@prisma/client";
import { updatePresaleCampaignIntentStatus } from "@/lib/presale-campaign-actions";
import { PRESALE_INTENT_STATUS_LABELS } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预售意向管理</h1>
        </div>
        <Link href="/admin/presale-campaigns" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          返回预售活动
        </Link>
      </header>

      <section className="space-y-3">
        {intents.length ? intents.map((intent) => (
          <article key={intent.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PRESALE_INTENT_STATUS_LABELS[intent.status]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{intent.source ?? "UNKNOWN"}</span>
                </div>
                <h2 className="mt-3 font-semibold text-ink">{intent.campaign.title}</h2>
                <p className="mt-1 text-sm text-ink/52">{intent.work.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">
                  {intent.name ?? intent.user?.nickname ?? "匿名用户"} / {contactText(intent)}
                </p>
                <p className="text-sm leading-6 text-ink/58">
                  {[intent.size && `尺码 ${intent.size}`, intent.color && `颜色 ${intent.color}`, `数量 ${intent.quantity}`, intent.note].filter(Boolean).join(" / ")}
                </p>
                <p className="mt-1 text-xs text-ink/40">{formatDate(intent.createdAt)}</p>
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
