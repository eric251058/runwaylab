import Link from "next/link";
import { notFound } from "next/navigation";
import { IncubationBatchStatus } from "@prisma/client";
import { BatchWorkSubmitForm } from "@/components/batches/BatchWorkSubmitForm";
import { getCurrentUser } from "@/lib/auth/session";
import {
  BATCH_PROVIDER_ROLE_LABELS,
  BATCH_PROVIDER_STATUS_LABELS,
  BATCH_WORK_STATUS_LABELS,
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  publicBatchWhere,
  publicQualityBatchWorkWhere,
  publicQualityWorkWhereForUser
} from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";
import { visualFor } from "@/components/works/work-visuals";

export const dynamic = "force-dynamic";

type BatchDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function dateText(value?: Date | null) {
  return value ? value.toLocaleDateString("zh-CN") : "未设置";
}

function metric(label: string, value: string | number) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const batchWorkWhere = await publicQualityBatchWorkWhere();
  const batch = await prisma.incubationBatch.findFirst({
    where: {
      slug,
      ...publicBatchWhere()
    },
    include: {
      school: true,
      challenge: true,
      works: {
        where: batchWorkWhere,
        include: {
          work: {
            include: {
              user: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              teacherRecommendations: true,
              fabricRecommendations: true,
              providerWorkProposals: true,
              presaleCampaignIntents: true,
              buyerIntents: true,
              votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
              opportunityProfile: true
            }
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
      },
      providers: {
        include: { provider: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!batch) notFound();

  const myWorkWhere = currentUser ? await publicQualityWorkWhereForUser(currentUser.id) : null;
  const myWorks = currentUser
    ? await prisma.work.findMany({
        where: myWorkWhere ?? { id: "__no_public_quality_work__" },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    : [];

  const stats = calculateBatchStats(batch);
  const selectedWorks = batch.works.filter((item) => item.status !== "REMOVED");
  const publicProviders = batch.providers.filter((item) => item.status === "CONFIRMED" || item.status === "COMPLETED");
  const canSubmit = batch.status === IncubationBatchStatus.RECRUITING;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/batches" className="text-sm font-semibold text-ink/55 hover:text-ink">返回批次列表</Link>
      <header className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
            {batch.featured ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">精选批次</span> : null}
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink md:text-6xl">{batch.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">{batch.summary}</p>
          <p className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">目标数量和意向数量不等同于正式订单。实际生产以最终确认和合作协议为准，本阶段不涉及支付、订单、物流或合同。</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Organizer</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{batch.organizerName}</h2>
          <p className="mt-2 text-sm text-ink/52">{[batch.organizerType, batch.city, batch.school?.name, batch.challenge?.title].filter(Boolean).join(" / ") || "组织信息待补充"}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {metric("作品数量", stats.workCount)}
            {metric("入选作品", stats.selectedWorkCount)}
            {metric("目标数量", batch.targetProductionQuantity ?? "未定")}
            {metric("确认数量", batch.confirmedProductionQuantity ? "已有确认" : "待验证")}
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-4">
        {metric("目标样衣", batch.targetSampleCount ?? "未定")}
        {metric("预计面料", stats.estimatedFabricMeters ? `${stats.estimatedFabricMeters} 米` : "未定")}
        {metric("补单预期", batch.expectedRepeatOrder ? "有可能" : "未明确")}
        {metric("服务商", stats.providerCount)}
      </section>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">批次推进</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metric("提交作品", stats.workCount)}
          {metric("候选作品", stats.shortlistedWorkCount)}
          {metric("打样中", stats.samplingWorkCount)}
          {metric("生产准备", stats.productionReadyWorkCount)}
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/58">{batch.publicNote ?? "平台会根据作品成熟度、服务商反馈和市场意向推进批次评估。"}</p>
      </section>

      {canSubmit ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-ink">提交作品参与</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">仅可提交你自己的公开作品，平台评估后决定是否入选。</p>
          </div>
          {currentUser ? (
            <BatchWorkSubmitForm batchId={batch.id} works={myWorks} />
          ) : (
            <Link href={`/login?next=/batches/${batch.slug}`} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">登录后提交作品</Link>
          )}
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Works</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">批次作品</h2>
          </div>
        </div>
        {selectedWorks.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedWorks.map((item, index) => (
              <Link key={item.id} href={`/works/${item.workId}`} className="overflow-hidden rounded-[8px] border border-black/8 bg-white">
                <img src={visualFor(index, item.work.images[0]?.imageUrl)} alt={item.work.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-4">
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{BATCH_WORK_STATUS_LABELS[item.status]}</span>
                  <h3 className="mt-3 line-clamp-2 font-semibold text-ink">{item.work.title}</h3>
                  <p className="mt-1 text-sm text-ink/52">{item.work.user.nickname}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">批次作品正在征集或评估中。</div>
        )}
      </section>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">参与服务商</h2>
        {publicProviders.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {publicProviders.map((item) => (
              <div key={item.id} className="rounded-[8px] bg-paper p-4">
                <p className="font-semibold text-ink">{item.provider.name}</p>
                <p className="mt-1 text-sm text-ink/52">{BATCH_PROVIDER_ROLE_LABELS[item.role]} / {BATCH_PROVIDER_STATUS_LABELS[item.status]}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/55">服务商仍在匹配中。</p>
        )}
      </section>
    </div>
  );
}
