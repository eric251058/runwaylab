import Link from "next/link";
import { ProviderApplicationStatus, ProviderStatus, ProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reviewProviderApplication } from "@/lib/provider-market-admin";
import { providerDuplicateRisks } from "@/lib/provider-duplicates";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";
import { ONBOARDING_PROVIDER_TYPES, PROVIDER_TYPE_SHORT_LABELS } from "@/lib/provider-onboarding";

export const dynamic = "force-dynamic";

const providerApplicationStatusLabels: Record<ProviderApplicationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function contactText(application: { phone?: string | null; email?: string | null; wechat?: string | null }) {
  return [application.phone && `手机 ${application.phone}`, application.email && `邮箱 ${application.email}`, application.wechat && `微信 ${application.wechat}`].filter(Boolean).join(" / ") || "联系方式待补充";
}

type AdminProviderApplicationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function selectedType(params: Record<string, string | string[] | undefined> | undefined) {
  const value = params?.type;
  const text = Array.isArray(value) ? value[0] : value;
  return ONBOARDING_PROVIDER_TYPES.includes(text as (typeof ONBOARDING_PROVIDER_TYPES)[number]) ? (text as ProviderType) : null;
}

function abilityText(application: {
  providerType: ProviderType;
  specialties: string[];
  categories: string[];
  serviceArea?: string | null;
  patternMaking?: string | null;
  sampleSupported?: boolean | null;
  singleSampleSupported?: boolean | null;
  smallOrderSupported?: boolean | null;
  minimumOrder?: string | null;
  leadTime?: string | null;
  priceRange?: string | null;
  monthlyCapacity?: string | null;
  qualityControl?: string | null;
}) {
  const base = [...application.specialties, ...application.categories].slice(0, 4);
  if (application.providerType === ProviderType.FABRIC_SUPPLIER) {
    return [base.join(" / "), application.sampleSupported ? "支持寄样" : null, application.minimumOrder, application.leadTime].filter(Boolean).join(" · ") || "能力待补充";
  }
  if (application.providerType === ProviderType.SAMPLE_STUDIO) {
    return [base.join(" / "), application.patternMaking ? `制版：${application.patternMaking}` : null, application.singleSampleSupported ? "单件打样" : null, application.smallOrderSupported ? "支持小单" : null, application.leadTime, application.priceRange].filter(Boolean).join(" · ") || "能力待补充";
  }
  if (application.providerType === ProviderType.FACTORY) {
    return [base.join(" / "), application.smallOrderSupported ? "支持小单" : null, application.minimumOrder, application.monthlyCapacity, application.leadTime].filter(Boolean).join(" · ") || "能力待补充";
  }
  return base.join(" / ") || application.serviceArea || "能力待补充";
}

export default async function AdminProviderApplicationsPage({ searchParams }: AdminProviderApplicationsPageProps) {
  const params = await searchParams;
  const type = selectedType(params);
  const showAll = params?.view === "all";
  const [applications, existingProviders] = await Promise.all([
    prisma.providerApplication.findMany({
      where: type ? { providerType: type } : undefined,
      include: {
        user: { select: { id: true, email: true, nickname: true } }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.provider.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        ownerId: true,
        contactEmail: true,
        type: true,
        status: true
      }
    })
  ]);
  const riskEntries = applications.map((application) => {
    const linkedDraft = existingProviders.find(
      (provider) => provider.status === ProviderStatus.PENDING && provider.ownerId && provider.ownerId === application.userId
    );
    const duplicateRisks = providerDuplicateRisks(
      application,
      existingProviders.filter((provider) => provider.id !== linkedDraft?.id)
    );
    return { applicationId: application.id, linkedDraft, duplicateRisks };
  });
  const exceptionCount = riskEntries.filter((entry) =>
    applications.find((application) => application.id === entry.applicationId)?.status === ProviderApplicationStatus.PENDING &&
    entry.duplicateRisks.some((risk) => risk.level === "high")
  ).length;
  const selfServiceCount = riskEntries.filter((entry) => entry.linkedDraft && !entry.duplicateRisks.some((risk) => risk.level === "high")).length;
  const completeCount = applications.filter((application) => application.city && application.description && (application.phone || application.email || application.wechat)).length;
  const applicationsNeedingAttention = applications.filter((application) => {
    if (application.status !== ProviderApplicationStatus.PENDING) return false;
    const entry = riskEntries.find((item) => item.applicationId === application.id);
    return !entry?.linkedDraft || entry.duplicateRisks.some((risk) => risk.level === "high");
  });
  const displayedApplications = showAll ? applications : applicationsNeedingAttention;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商异常治理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">正常入驻由服务商自助完成。这里优先处理重复主体、资料冲突和违规风险，不再逐个代替服务商开通或经营。</p>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin/provider-applications" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!showAll && !type ? "bg-ink text-white" : "bg-white text-ink/60"}`}>仅需处理</Link>
        <Link href="/admin/provider-applications?view=all" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${showAll && !type ? "bg-ink text-white" : "bg-white text-ink/60"}`}>全部记录</Link>
        {ONBOARDING_PROVIDER_TYPES.map((item) => (
          <Link key={item} href={`/admin/provider-applications?type=${item}${showAll ? "&view=all" : ""}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${type === item ? "bg-ink text-white" : "bg-white text-ink/60"}`}>
            {PROVIDER_TYPE_SHORT_LABELS[item]}
          </Link>
        ))}
      </nav>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">异常待核验</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{exceptionCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">仅统计高风险重复主体</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">自助准备中</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{selfServiceCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">无需平台日常介入</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">资料较完整</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{completeCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">已填写城市、介绍和联系方式</p>
        </div>
      </section>

      <section className="space-y-3">
        {displayedApplications.length ? displayedApplications.map((application) => {
          const riskEntry = riskEntries.find((entry) => entry.applicationId === application.id);
          const duplicateRisks = riskEntry?.duplicateRisks ?? [];
          const selfServiceManaged = Boolean(riskEntry?.linkedDraft) && !duplicateRisks.some((risk) => risk.level === "high");
          return (
          <article key={application.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_TYPE_LABELS[application.providerType]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{providerApplicationStatusLabels[application.status]}</span>
                  {application.city ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{application.city}</span> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{application.companyName}</h2>
                <p className="mt-1 text-sm text-ink/52">申请人：{application.contactName} / {contactText(application)}</p>
                <p className="mt-1 text-xs text-ink/40">绑定账号：{application.user?.email ?? application.email ?? "未记录"}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">核心能力：{abilityText(application)}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">能力说明：{application.description ?? "简介待补充"}</p>
                {duplicateRisks.length ? (
                  <div className="mt-3 rounded-[6px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    <p className="font-semibold">重复风险提示</p>
                    {duplicateRisks.map((risk) => (
                      <p key={risk.message} className="mt-1">{risk.message}</p>
                    ))}
                  </div>
                ) : null}
                {application.qualityControl ? <p className="mt-1 text-xs leading-5 text-ink/45">品控说明：{application.qualityControl}</p> : null}
                <p className="mt-1 text-xs text-ink/40">申请时间：{formatDate(application.createdAt)}</p>
              </div>
              {application.status === ProviderApplicationStatus.PENDING && !selfServiceManaged ? (
                <div className="grid gap-2 md:w-72">
                  {[ProviderApplicationStatus.APPROVED, ProviderApplicationStatus.REJECTED].map((status) => (
                    <form key={status} action={reviewProviderApplication} className="grid gap-2">
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="status" value={status} />
                      <input name="reviewNote" placeholder="审核备注" className="h-9 rounded-[6px] border border-black/10 px-3 text-xs" />
                      <button className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">{status === "APPROVED" ? "通过并生成服务商" : "拒绝"}</button>
                    </form>
                  ))}
                </div>
              ) : application.status === ProviderApplicationStatus.PENDING ? (
                <p className="rounded-[6px] bg-paper px-4 py-3 text-xs leading-5 text-ink/55 md:w-72">
                  服务商正在自助完善资料。无需后台操作；达到公开标准后可自行开通。
                </p>
              ) : (
                <p className="rounded-[6px] bg-paper px-4 py-3 text-xs leading-5 text-ink/55 md:w-72">
                  该申请已完成审核，不可重复操作。
                </p>
              )}
            </div>
          </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">{showAll ? "暂无入驻记录。" : "暂无需要平台处理的异常。正常入驻会由服务商自助完成。"}</div>}
      </section>
    </div>
  );
}
