import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { updateProviderInquiry } from "@/lib/provider-center-actions";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";
import { PROVIDER_INQUIRY_STATUS_LABELS, PROVIDER_INQUIRY_TYPE_LABELS } from "@/lib/supply-network";

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

export default async function ProviderCenterInquiriesPage() {
  const { provider } = await getProviderCenterContext("/provider-center/inquiries");
  if (!provider) redirect("/providers/apply");

  const inquiries = await prisma.cooperationRequest.findMany({
    where: { providerId: provider.id },
    include: {
      user: { select: { id: true, nickname: true, email: true } },
      work: { select: { id: true, title: true } },
      fabric: { select: { id: true, name: true, slug: true } },
      showcaseItem: { select: { id: true, title: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">INQUIRIES</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">处理合作询盘</h1>
          <p className="mt-3 text-sm text-ink/52">本轮只做一次性处理记录，不开发连续聊天。</p>
        </div>
        <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
      </header>

      {inquiries.length ? (
        <section className="space-y-4">
          {inquiries.map((inquiry) => (
            <article key={inquiry.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_INQUIRY_STATUS_LABELS[inquiry.status]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_INQUIRY_TYPE_LABELS[inquiry.requestType]}</span>
                    {inquiry.quantity ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">数量 {inquiry.quantity}</span> : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{inquiry.user.nickname} 的合作需求</h2>
                  <p className="mt-1 text-sm text-ink/52">提交时间：{formatDate(inquiry.createdAt)} / 联系偏好：{inquiry.contactPreference || inquiry.contact}</p>
                  {inquiry.work ? <p className="mt-1 text-sm text-ink/52">关联作品：<Link href={`/works/${inquiry.work.id}`} className="underline">{inquiry.work.title}</Link></p> : null}
                  {inquiry.fabric ? <p className="mt-1 text-sm text-ink/52">关联面料：<Link href={`/fabrics/${inquiry.fabric.slug ?? inquiry.fabric.id}`} className="underline">{inquiry.fabric.name}</Link></p> : null}
                  {inquiry.showcaseItem ? <p className="mt-1 text-sm text-ink/52">关联案例：{inquiry.showcaseItem.title}</p> : null}
                  <p className="mt-3 whitespace-pre-line rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/60">{inquiry.message || "未填写详细说明"}</p>
                  {inquiry.providerResponse ? <p className="mt-3 rounded-[6px] border border-black/8 p-3 text-sm leading-6 text-ink/60">处理说明：{inquiry.providerResponse}</p> : null}
                </div>
                <form action={updateProviderInquiry} className="grid gap-2 lg:w-80">
                  <input type="hidden" name="id" value={inquiry.id} />
                  <textarea name="providerResponse" defaultValue={inquiry.providerResponse ?? ""} placeholder="处理说明，如：已联系、暂不匹配、需要更多资料。" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <button name="status" value={RequestStatus.CONTACTED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">标记已读</button>
                    <button name="status" value={RequestStatus.QUOTED} className="h-10 rounded-full bg-ink px-3 text-xs font-semibold text-white">标记已回复</button>
                    <button name="status" value={RequestStatus.CLOSED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">关闭</button>
                    <button name="status" value={RequestStatus.COMPLETED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">已完成</button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">暂时还没有新的合作询盘。完善主页和案例后，更容易被设计师判断和联系。</div>
      )}
    </div>
  );
}
