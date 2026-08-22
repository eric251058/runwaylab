import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { evaluateProviderPilotReadiness } from "@/lib/provider-pilot-readiness";

export const dynamic = "force-dynamic";

function stat(label: string, value: number, note: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/38">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink/52">{note}</p>
    </div>
  );
}

export default async function ProviderPilotReadinessPage() {
  const now = new Date();
  const providers = await prisma.provider.findMany({
    include: {
      owner: { select: { id: true, nickname: true, email: true } },
      fabrics: { select: { id: true, status: true } },
      showcaseItems: { select: { id: true, status: true } },
      inquiries: { select: { id: true, status: true, createdAt: true } },
      subscriptions: {
        select: { id: true, status: true, startsAt: true, endsAt: true, trialEndsAt: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }]
  });

  const rows = providers.map((provider) => {
    const activeSubscription = provider.subscriptions.some((subscription) => {
      if (subscription.status !== "ACTIVE") return false;
      const started = !subscription.startsAt || subscription.startsAt <= now;
      const validUntil = subscription.trialEndsAt ?? subscription.endsAt;
      return started && (!validUntil || validUntil >= now);
    });
    const capabilityCount = new Set([
      ...provider.categories,
      ...provider.materials,
      ...provider.techniques,
      ...provider.specialties
    ].map((item) => item.trim()).filter(Boolean)).size;
    const minimumOrderValues = [
      provider.minimumOrderQuantity,
      provider.moqMin,
      provider.minimumOrder
    ];
    const readiness = evaluateProviderPilotReadiness({
      status: provider.status,
      isVerified: provider.isVerified,
      hasOwner: Boolean(provider.owner),
      name: provider.name,
      tagline: provider.tagline,
      description: provider.description,
      contactChannelCount: [
        provider.contactPhone,
        provider.contactEmail,
        provider.wechat,
        provider.whatsapp,
        provider.website
      ].filter((value) => Boolean(value?.trim())).length,
      capabilityCount,
      hasMinimumOrder: minimumOrderValues.some((value) => typeof value === "number" ? value > 0 : Boolean(value?.trim())),
      hasLeadTime: Boolean(provider.sampleLeadDays || provider.productionLeadDays || provider.leadTime?.trim()),
      publishedProductCount:
        provider.fabrics.filter((fabric) => fabric.status === "ACTIVE").length +
        provider.showcaseItems.filter((item) => item.status === "PUBLISHED").length,
      activeSubscription,
      pendingInquiryCreatedAt: provider.inquiries
        .filter((inquiry) => inquiry.status === "PENDING")
        .map((inquiry) => inquiry.createdAt),
      now
    });
    return { provider, readiness };
  });

  const readyCount = rows.filter((row) => row.readiness.ready).length;
  const verifiedActiveCount = rows.filter((row) => row.provider.status === "ACTIVE" && row.provider.isVerified).length;
  const commercialCount = rows.filter((row) => row.readiness.commercialPlanReady).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · Provider Pilot</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商试点准入</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink/58">
            把主体可信度、公开资料、产能边界和真实供给集中检查。这里只读诊断，不自动收费、不自动推荐，也不改变服务商状态。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/providers" className="rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-semibold text-ink">返回服务商管理</Link>
          <Link href="/providers" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">查看公开服务商</Link>
        </div>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {stat("全部服务商", rows.length, "当前纳入运营检查的主体")}
        {stat("可进入试点", readyCount, "没有准入阻断项")}
        {stat("已认证且启用", verifiedActiveCount, "主体可信度基础")}
        {stat("套餐有效", commercialCount, "仅作商业状态参考")}
      </section>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/35">First Pilot Policy</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">先验证真实交付，再验证付费</h2>
        <p className="mt-3 text-sm leading-7 text-ink/58">
          首批试点不把订阅套餐作为准入门槛。平台先帮助服务商获得真实询盘、形成响应与交付记录；价值被证明后，再进入月度或季度套餐。
        </p>
      </section>

      <section className="mt-6 space-y-4">
        {rows.length ? rows.map(({ provider, readiness }) => {
          const blockers = readiness.issues.filter((issue) => issue.severity === "BLOCKER");
          const warnings = readiness.issues.filter((issue) => issue.severity === "WARNING");
          return (
            <article key={provider.id} className="rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={readiness.ready ? "rounded-full bg-lime px-3 py-1 text-xs font-semibold text-ink" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"}>
                      {readiness.ready ? "可进入试点" : blockers.length + " 个阻断项"}
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-ink/58">{provider.status}</span>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-ink/58">
                      检查 {readiness.passedChecks}/{readiness.totalChecks}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-ink">{provider.name}</h2>
                  <p className="mt-1 text-sm text-ink/52">
                    负责人：{provider.owner?.nickname || provider.owner?.email || "未绑定"} · 套餐：{readiness.commercialPlanReady ? "有效" : "试点期未启用"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={"/providers/" + (provider.slug || provider.id)} className="rounded-full border border-black/12 px-4 py-2 text-sm font-semibold text-ink">公开页</Link>
                  <Link href="/admin/providers?tab=providers" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">完善资料</Link>
                </div>
              </div>

              {readiness.issues.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[...blockers, ...warnings].map((issue) => (
                    <div key={issue.code} className={issue.severity === "BLOCKER" ? "rounded-[8px] border border-amber-200 bg-amber-50 p-4" : "rounded-[8px] border border-blue-100 bg-blue-50 p-4"}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{issue.label}</p>
                          <p className="mt-1 text-sm leading-6 text-ink/58">{issue.detail}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink/38">{issue.severity === "BLOCKER" ? "阻断" : "提醒"}</span>
                      </div>
                      <Link href={issue.actionHref} className="mt-3 inline-flex text-sm font-semibold text-ink underline underline-offset-4">{issue.actionLabel}</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[8px] bg-lime/35 p-4 text-sm leading-6 text-ink">
                  主体、资料、产能与公开供给均已达到首批试点标准。建议由运营人工确认后安排真实客户询盘。
                </div>
              )}
            </article>
          );
        }) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-8 text-sm text-ink/55">暂无服务商数据。</div>
        )}
      </section>
    </main>
  );
}
