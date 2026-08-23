import Link from "next/link";
import type { Metadata } from "next";
import { ProviderApplicationStatus, ProviderShowcaseStatus, ProviderStatus, RequestStatus } from "@prisma/client";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { activateProviderSelfService } from "@/lib/provider-center-actions";
import { providerDuplicateRisks } from "@/lib/provider-duplicates";
import { PROVIDER_WORKBENCH_COPY, isOnboardingProviderType } from "@/lib/provider-onboarding";
import { providerSelfServiceReadiness } from "@/lib/provider-self-service";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_AVAILABILITY_LABELS,
  SUPPLY_PROVIDER_TYPE_LABELS,
  providerCompleteness,
  providerPublicUrl
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "服务商工作台",
  robots: { index: false, follow: false }
};

const applicationLabels: Record<ProviderApplicationStatus, string> = {
  PENDING: "审核中",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

const processingInquiryStatuses: RequestStatus[] = [RequestStatus.CONTACTED, RequestStatus.EVALUATED, RequestStatus.QUOTED];

function stat(label: string, value: number | string) {
  return (
    <div className="rounded-[8px] bg-white p-4">
      <p className="text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink/45">{label}</p>
    </div>
  );
}

function actionCard(title: string, description: string, href: string) {
  return (
    <Link href={href} className="rounded-[8px] bg-white p-5 transition hover:border-ink/30">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/52">{description}</p>
    </Link>
  );
}

type ProviderCenterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProviderCenterPage({ searchParams }: ProviderCenterPageProps) {
  const params = await searchParams;
  const { user, provider, application } = await getProviderCenterContext("/provider-center");

  if (!provider) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-12">
        <div className="rounded-[8px] bg-white p-6">
          <h1 className="text-3xl font-semibold text-ink">服务商工作台</h1>
          {application ? (
            <div className="mt-5 rounded-[12px] bg-paper p-4">
              <p className="text-sm font-semibold text-ink">服务商申请{applicationLabels[application.status]}</p>
              <p className="mt-2 text-sm leading-6 text-ink/58">
                {application.status === ProviderApplicationStatus.PENDING
                  ? "这是一条旧版申请，平台正在协助迁移到自助工作台。"
                  : application.reviewNote || "可以根据反馈重新完善申请资料。"}
              </p>
              {application.status === ProviderApplicationStatus.REJECTED ? <Link href="/providers/apply" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">重新提交申请</Link> : null}
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm leading-6 text-ink/58">你还没有提交服务商入驻申请。通过审核后，可以管理主页、面料、案例和合作询盘。</p>
              <Link href="/providers/apply" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">申请成为服务商</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const fullProvider = await prisma.provider.findUnique({
    where: { id: provider.id },
    include: {
      fabrics: true,
      showcaseItems: true,
      inquiries: true
    }
  });

  if (!fullProvider) {
    return null;
  }

  const completeness = providerCompleteness(fullProvider);
  const selfServiceReadiness = providerSelfServiceReadiness(fullProvider);
  const pending = fullProvider.status === ProviderStatus.PENDING;
  const duplicateCandidates = pending
    ? await prisma.provider.findMany({
        where: {
          id: { not: fullProvider.id },
          OR: [
            { ownerId: user.id },
            ...(fullProvider.contactEmail ? [{ contactEmail: { equals: fullProvider.contactEmail, mode: "insensitive" as const } }] : []),
            ...(fullProvider.city ? [{ city: fullProvider.city }] : [])
          ]
        },
        select: { id: true, name: true, city: true, ownerId: true, contactEmail: true, type: true }
      })
    : [];
  const duplicateRisks = providerDuplicateRisks(
    {
      userId: user.id,
      companyName: fullProvider.name,
      city: fullProvider.city,
      email: fullProvider.contactEmail,
      providerType: fullProvider.type
    },
    duplicateCandidates
  );
  const hasHighDuplicateRisk = duplicateRisks.some((risk) => risk.level === "high");
  const publicFabrics = fullProvider.fabrics.filter((fabric) => fabric.status === "ACTIVE").length;
  const publicShowcase = fullProvider.showcaseItems.filter((item) => item.status === ProviderShowcaseStatus.PUBLISHED).length;
  const newInquiries = fullProvider.inquiries.filter((item) => item.status === RequestStatus.PENDING).length;
  const processingInquiries = fullProvider.inquiries.filter((item) => processingInquiryStatuses.includes(item.status)).length;
  const suspended = fullProvider.status === ProviderStatus.SUSPENDED;
  const workbenchCopy = isOnboardingProviderType(fullProvider.type)
    ? PROVIDER_WORKBENCH_COPY[fullProvider.type]
    : {
        title: "服务商工作台",
        description: "维护主页、案例和合作需求。",
        primaryLabel: "上传案例",
        primaryHref: "/provider-center/showcase/new",
        secondaryLabel: "管理案例",
        secondaryHref: "/provider-center/showcase",
        opportunityLabel: "查看合作机会",
        opportunityHref: "/providers/opportunities"
      };
  const profileUpdated = searchValue(params, "profile") === "updated";
  const activated = searchValue(params, "activated") === "1";
  const nextTask = pending && selfServiceReadiness.missing.length
    ? { title: "完成公开准备", description: `还需补充：${selfServiceReadiness.missing.slice(0, 3).join("、")}。`, href: !fullProvider.logoUrl && !fullProvider.coverUrl ? "/provider-center/profile" : fullProvider.type === "FABRIC_SUPPLIER" && fullProvider.fabrics.length === 0 ? "/provider-center/fabrics/new" : "/provider-center/showcase/new" }
    : !fullProvider.logoUrl || !fullProvider.coverUrl
    ? { title: "完善品牌形象", description: "补充 Logo、封面和一句定位，让公开主页更可信。", href: "/provider-center/profile" }
    : fullProvider.type === "FABRIC_SUPPLIER" && publicFabrics === 0
      ? { title: "上传第一款面料", description: "添加一款带图片的面料，供设计师浏览和询盘。", href: "/provider-center/fabrics/new" }
      : publicShowcase === 0
        ? { title: fullProvider.type === "FACTORY" ? "上传第一个生产案例" : "上传第一个打样案例", description: "展示真实能力，帮助设计师判断是否合适。", href: "/provider-center/showcase/new" }
        : newInquiries > 0
          ? { title: "处理新询盘", description: "有新的合作需求等待查看，建议尽快处理。", href: "/provider-center/inquiries" }
          : { title: "继续维护主页", description: "定期更新产品、案例和联系方式，保持公开主页准确。", href: "/provider-center" };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 rounded-[8px] bg-white p-5 md:p-7">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">{workbenchCopy.title}</h1>
          <p className="mt-3 text-sm text-ink/52">{SUPPLY_PROVIDER_TYPE_LABELS[fullProvider.type]} / {fullProvider.city || "城市未填写"} / {PROVIDER_AVAILABILITY_LABELS[fullProvider.availabilityStatus]}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/55">{workbenchCopy.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={workbenchCopy.primaryHref} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">{workbenchCopy.primaryLabel}</Link>
            {!pending ? <Link href={providerPublicUrl(fullProvider)} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">查看主页</Link> : null}
          </div>
        </div>
      </header>

      {pending ? (
        <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/35">Self-service opening</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">工作台已开放，公开主页由你决定何时上线</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">
            你可以先完善资料、准备产品和案例，平台不会逐项代管。达到最低公开标准后可自助开通；只有重复主体或风险异常才进入平台核验。
          </p>
          {hasHighDuplicateRisk ? (
            <p className="mt-4 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              检测到可能重复的服务商主体，已自动进入例外核验。你无需反复提交，仍可继续维护工作台内容。
            </p>
          ) : selfServiceReadiness.ready ? (
            <form action={activateProviderSelfService} className="mt-4">
              <button className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">自助开通公开主页</button>
            </form>
          ) : (
            <p className="mt-4 rounded-[6px] bg-paper px-4 py-3 text-sm text-ink/58">
              待完成：{selfServiceReadiness.missing.join("、")}
            </p>
          )}
        </section>
      ) : null}

      {suspended ? (
        <div className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/58">
          当前服务商账号已暂停，暂不允许新增公开内容。你仍可以查看历史资料和询盘。
        </div>
      ) : null}

      {profileUpdated ? (
        <div className="mb-6 rounded-[14px] bg-white p-5 text-sm leading-6 text-ink/65">
          主页资料已保存。下一步可以上传第一款面料、发布第一个案例，或开启询盘处理。
        </div>
      ) : null}

      {activated ? (
        <div className="mb-6 rounded-[14px] bg-white p-5 text-sm leading-6 text-ink/65">
          公开主页已开通。你的资料、产品和案例由你持续维护；平台仅处理投诉、违规和重复主体等异常。
        </div>
      ) : null}

      <section className="mb-6 rounded-[8px] bg-ink p-5 text-white md:p-7">
        <p className="text-sm font-semibold text-white/55">下一步</p>
        <h2 className="mt-2 text-2xl font-semibold">{nextTask.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">{nextTask.description}</p>
        <Link href={nextTask.href} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink">去完成</Link>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {fullProvider.type === "FABRIC_SUPPLIER" ? stat("已发布面料", publicFabrics) : stat("公开案例", publicShowcase)}
        {fullProvider.type === "FABRIC_SUPPLIER" ? stat("公开案例", publicShowcase) : stat("服务类型", SUPPLY_PROVIDER_TYPE_LABELS[fullProvider.type])}
        {stat("新询盘", newInquiries)}
        {stat("处理中询盘", processingInquiries)}
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {actionCard(workbenchCopy.primaryLabel, fullProvider.type === "FABRIC_SUPPLIER" ? "上传可公开展示的面料产品。" : "上传可公开展示的服务案例。", workbenchCopy.primaryHref)}
        {actionCard(workbenchCopy.secondaryLabel, fullProvider.type === "FABRIC_SUPPLIER" ? "维护面料产品和公开状态。" : "维护打样或生产案例。", workbenchCopy.secondaryHref)}
        {actionCard(workbenchCopy.opportunityLabel, fullProvider.type === "FABRIC_SUPPLIER" ? "查看推荐给设计师的产品和反馈。" : "查看适合参与的作品机会。", workbenchCopy.opportunityHref)}
        {actionCard("收到的合作需求", "查看并回应设计师发来的需求。", "/provider-center/inquiries")}
        {actionCard("服务商资料", "更新品牌形象和联系方式。", "/provider-center/profile")}
        {actionCard("会员与权益", "查看当前额度、套餐申请与审核记录。", "/provider-center/membership")}
      </section>
    </div>
  );
}
