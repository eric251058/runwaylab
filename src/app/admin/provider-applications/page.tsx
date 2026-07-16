import Link from "next/link";
import { ProviderApplicationStatus, ProviderType } from "@prisma/client";
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
        type: true
      }
    })
  ]);
  const pendingCount = applications.filter((application) => application.status === ProviderApplicationStatus.PENDING).length;
  const completeCount = applications.filter((application) => application.city && application.description && (application.phone || application.email || application.wechat)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">入驻审核</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">这里用于筛选面料商、打样工作室、工厂和专业服务。审核通过后会生成服务商主页，并绑定到申请账号。</p>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin/provider-applications" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!type ? "bg-ink text-white" : "bg-white text-ink/60"}`}>全部</Link>
        {ONBOARDING_PROVIDER_TYPES.map((item) => (
          <Link key={item} href={`/admin/provider-applications?type=${item}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${type === item ? "bg-ink text-white" : "bg-white text-ink/60"}`}>
            {PROVIDER_TYPE_SHORT_LABELS[item]}
          </Link>
        ))}
      </nav>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">待处理申请</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{pendingCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">需要运营审核的服务商申请</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">资料较完整</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{completeCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">已填写城市、能力说明和联系方式</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">申请总数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{applications.length}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">当前后台可查看的入驻申请</p>
        </div>
      </section>

      <section className="space-y-3">
        {applications.length ? applications.map((application) => {
          const duplicateRisks = providerDuplicateRisks(application, existingProviders);
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
            </div>
          </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无入驻申请。</div>}
      </section>
    </div>
  );
}
