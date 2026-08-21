import { ProviderSubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/guards";
import { PROVIDER_MEMBERSHIP_PLANS } from "@/lib/provider-membership";
import { reviewProviderSubscription } from "@/lib/provider-subscription-actions";
import { providerSubscriptionDisplayStatus } from "@/lib/provider-subscription";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function date(value: Date | null) {
  return value ? value.toLocaleString("zh-CN") : "—";
}

export default async function AdminProviderSubscriptionsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/login?next=/admin/provider-subscriptions");
  const subscriptions = await prisma.providerSubscription.findMany({
    include: { provider: { select: { name: true, type: true, status: true } }, requestedBy: { select: { nickname: true } }, reviewedBy: { select: { nickname: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · Provider subscriptions</p>
      <h1 className="mt-3 text-4xl font-semibold text-ink">服务商套餐审核</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/58">这里只启用平台权益，不代表系统已在线收款。付费套餐应在完成线下商务核对后启用；所有动作写入管理员审计记录。</p>
      <div className="mt-8 space-y-4">
        {subscriptions.length ? subscriptions.map((item) => {
          const plan = PROVIDER_MEMBERSHIP_PLANS.find((candidate) => candidate.id === item.plan);
          return <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-lg font-semibold text-ink">{item.provider.name}</h2><p className="mt-1 text-sm text-ink/55">{plan?.name ?? item.plan} · ¥{item.priceCny} · {providerSubscriptionDisplayStatus(item)}</p><p className="mt-2 text-xs text-ink/40">申请人 {item.requestedBy.nickname} · {date(item.requestedAt)} · 有效期 {date(item.startsAt)} — {date(item.endsAt)}</p>{item.reviewNote ? <p className="mt-2 text-xs text-ink/50">审核说明：{item.reviewNote}</p> : null}</div><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{item.provider.status}</span></div>
          {item.status === ProviderSubscriptionStatus.PENDING ? <form action={reviewProviderSubscription} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="subscriptionId" value={item.id} /><input name="reviewNote" required minLength={4} placeholder="商务核对或拒绝说明（至少 4 个字，写入审计）" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" /><button name="action" value="ACTIVATE" className="rounded-full bg-ink px-5 text-sm font-semibold text-white">审核并启用</button><button name="action" value="REJECT" className="rounded-full border border-red-200 px-5 text-sm font-semibold text-red-700">拒绝</button></form> : null}
          {item.status === ProviderSubscriptionStatus.ACTIVE && item.endsAt && item.endsAt > new Date() ? <form action={reviewProviderSubscription} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input type="hidden" name="subscriptionId" value={item.id} /><input name="reviewNote" required minLength={2} placeholder="取消原因（必填并写入审计）" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" /><button name="action" value="CANCEL" className="rounded-full border border-red-200 px-5 text-sm font-semibold text-red-700">取消权益</button></form> : null}
          </article>;
        }) : <div className="rounded-[8px] bg-white p-6 text-sm text-ink/50">暂无套餐申请。</div>}
      </div>
    </div>
  );
}
