import Link from "next/link";
import { ProviderApplicationStatus, ProviderShowcaseStatus, ProviderStatus, RequestStatus } from "@prisma/client";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_AVAILABILITY_LABELS,
  PROVIDER_SHOWCASE_STATUS_LABELS,
  SUPPLY_PROVIDER_TYPE_LABELS,
  providerCompleteness,
  providerPublicUrl
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

const applicationLabels: Record<ProviderApplicationStatus, string> = {
  PENDING: "审核中",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

function stat(label: string, value: number | string, note: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/45">{note}</p>
    </div>
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
  const { provider, application } = await getProviderCenterContext("/provider-center");

  if (!provider) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-[8px] border border-black/8 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PROVIDER CENTER</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">供应商中心</h1>
          {application ? (
            <div className="mt-5 rounded-[8px] bg-paper p-4">
              <p className="text-sm font-semibold text-ink">入驻申请：{applicationLabels[application.status]}</p>
              <p className="mt-2 text-sm leading-6 text-ink/58">{application.companyName} / {application.reviewNote || "平台会根据资料完整度和服务能力进行审核。"}</p>
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
  const publicFabrics = fullProvider.fabrics.filter((fabric) => fabric.status === "ACTIVE").length;
  const publicShowcase = fullProvider.showcaseItems.filter((item) => item.status === ProviderShowcaseStatus.PUBLISHED).length;
  const pendingShowcase = fullProvider.showcaseItems.filter((item) => item.status === ProviderShowcaseStatus.PENDING_REVIEW).length;
  const newInquiries = fullProvider.inquiries.filter((item) => item.status === RequestStatus.PENDING).length;
  const handledInquiries = fullProvider.inquiries.filter((item) => item.status !== RequestStatus.PENDING).length;
  const suspended = fullProvider.status === ProviderStatus.SUSPENDED;
  const profileUpdated = searchValue(params, "profile") === "updated";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PROVIDER CENTER</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{fullProvider.name}</h1>
          <p className="mt-3 text-sm text-ink/52">{SUPPLY_PROVIDER_TYPE_LABELS[fullProvider.type]} / {fullProvider.city || "城市待补充"} / {PROVIDER_AVAILABILITY_LABELS[fullProvider.availabilityStatus]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={providerPublicUrl(fullProvider)} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">公开主页</Link>
          <Link href="/provider-center/profile" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">完善主页</Link>
        </div>
      </header>

      {suspended ? (
        <div className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/58">
          当前服务商账号已暂停，暂不允许新增公开内容。你仍可以查看历史资料和询盘。
        </div>
      ) : null}

      {profileUpdated ? (
        <div className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/65">
          主页资料已保存。下一步可以上传第一款面料、发布第一个案例，或开启询盘处理。
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {stat("主页完整度", `${completeness.percent}%`, completeness.missing.length ? `还缺：${completeness.missing.slice(0, 3).join("、")}` : "资料较完整")}
        {stat("公开面料", publicFabrics, "当前可在面料库展示")}
        {stat("公开案例", publicShowcase, "已通过审核的案例")}
        {stat("待审核内容", pendingShowcase, PROVIDER_SHOWCASE_STATUS_LABELS.PENDING_REVIEW)}
        {stat("新询盘", newInquiries, "需要尽快查看")}
        {stat("已处理询盘", handledInquiries, "已读、回复或关闭")}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/provider-center/profile" className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">完善主页</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">补充能力、MOQ、周期、联系方式和公开展示开关。</p>
        </Link>
        <Link href="/provider-center/fabrics" className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">管理面料</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">面料商可维护自己的面料产品，并展示在面料库。</p>
        </Link>
        <Link href="/provider-center/showcase" className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">管理案例</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">提交打样、生产或专业服务案例，审核通过后公开。</p>
        </Link>
        <Link href="/provider-center/inquiries" className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">处理询盘</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">查看设计师发来的合作需求，标记已读、回复或关闭。</p>
        </Link>
      </section>
    </div>
  );
}
