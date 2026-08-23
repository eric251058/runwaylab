import { ProviderSubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { PROVIDER_MEMBERSHIP_PLANS } from "@/lib/provider-membership";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { requestProviderSubscription } from "@/lib/provider-subscription-actions";
import { getProviderEntitlements, providerSubscriptionDisplayStatus } from "@/lib/provider-subscription";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function date(value: Date | null) {
  return value ? value.toLocaleDateString("zh-CN") : "待生效";
}

export default async function ProviderMembershipPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { provider } = await getProviderCenterContext("/provider-center/membership");
  if (!provider) redirect("/providers/apply");
  const [subscriptions, entitlements] = await Promise.all([
    prisma.providerSubscription.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    getProviderEntitlements(provider.id)
  ]);
  const blocked = subscriptions.some((item) => item.status === ProviderSubscriptionStatus.PENDING || (item.status === ProviderSubscriptionStatus.ACTIVE && item.endsAt && item.endsAt > new Date()));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider membership</p>
      <h1 className="mt-3 text-4xl font-semibold text-ink">会员与权益</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/58">首批试运营权益由已开通服务商自行启用；付费套餐在未接在线支付前仍由平台核对后生效。平台不自动扣费，也不出售虚假排名或承诺订单。</p>
      {params?.activated === "1" ? <p className="mt-5 rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">90 天首批试运营权益已开通，可以立即完善产品并接收询盘。</p> : null}
      {params?.requested === "1" ? <p className="mt-5 rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">付费套餐申请已提交，平台仅核对套餐与商务信息。</p> : null}

      <section className="mt-7 grid gap-4 rounded-[8px] bg-white p-5 md:grid-cols-4">
        <div><p className="text-xs text-ink/40">当前权益</p><p className="mt-2 font-semibold text-ink">{entitlements.label}</p></div>
        <div><p className="text-xs text-ink/40">产品额度</p><p className="mt-2 font-semibold text-ink">最多 {entitlements.productLimit} 个</p></div>
        <div><p className="text-xs text-ink/40">AI 图片录入</p><p className="mt-2 font-semibold text-ink">{entitlements.aiProductExtractionEnabled ? "已包含" : "未包含"}</p></div>
        <div><p className="text-xs text-ink/40">有效期</p><p className="mt-2 font-semibold text-ink">{entitlements.subscription ? `${date(entitlements.subscription.startsAt)} — ${date(entitlements.subscription.endsAt)}` : "过渡期"}</p></div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {PROVIDER_MEMBERSHIP_PLANS.map((plan) => (
          <article key={plan.id} className={`rounded-[8px] border bg-white p-5 ${plan.recommended ? "border-ink" : "border-black/8"}`}>
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink">{plan.name}</h2><p className="mt-1 text-sm text-ink/50">{plan.description}</p></div><p className="shrink-0 font-semibold text-ink">{plan.priceLabel}</p></div>
            <ul className="mt-4 space-y-2 text-sm text-ink/65">{plan.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}</ul>
            <ul className="mt-4 space-y-1 text-xs text-ink/42">{plan.limits.map((limit) => <li key={limit}>边界：{limit}</li>)}</ul>
            <form action={requestProviderSubscription} className="mt-5"><input type="hidden" name="plan" value={plan.id} /><button disabled={blocked} className="h-11 w-full rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/20">{blocked ? "已有待审或生效套餐" : plan.id === "FOUNDING_TRIAL" ? "立即开通 90 天试运营" : "申请此套餐"}</button></form>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[8px] bg-white p-5"><h2 className="text-xl font-semibold text-ink">申请记录</h2><div className="mt-4 space-y-3">{subscriptions.length ? subscriptions.map((item) => <div key={item.id} className="rounded-[6px] bg-paper px-4 py-3 text-sm text-ink/65"><span className="font-semibold">{PROVIDER_MEMBERSHIP_PLANS.find((plan) => plan.id === item.plan)?.name ?? item.plan}</span><span className="mx-2">·</span>{providerSubscriptionDisplayStatus(item)}<span className="mx-2">·</span>{date(item.startsAt)} — {date(item.endsAt)}{item.reviewNote ? <p className="mt-2 text-xs text-ink/45">审核说明：{item.reviewNote}</p> : null}</div>) : <p className="text-sm text-ink/45">暂无套餐申请。</p>}</div></section>
    </div>
  );
}
