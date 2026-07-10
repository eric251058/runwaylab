import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProviderBatchApplyForm } from "@/components/batches/ProviderBatchApplyForm";
import { getCurrentUser } from "@/lib/auth/session";
import {
  BATCH_PROVIDER_ROLE_LABELS,
  BATCH_PROVIDER_STATUS_LABELS,
  BATCH_WORK_STATUS_LABELS,
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  providerBatchRecommendationReason,
  providerCanSeeBatch
} from "@/lib/incubation-batches";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { visualFor } from "@/components/works/work-visuals";

export const dynamic = "force-dynamic";

type ProviderBatchDetailPageProps = {
  params: Promise<{
    batchId: string;
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

export default async function ProviderBatchDetailPage({ params }: ProviderBatchDetailPageProps) {
  const { batchId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/providers/batches/${batchId}`);
  }

  const provider = await getProviderForUser(user);
  if (!provider) redirect("/providers/batches");

  const batch = await prisma.incubationBatch.findUnique({
    where: { id: batchId },
    include: {
      works: {
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
        where: { providerId: provider.id },
        include: { provider: true }
      }
    }
  });

  if (!batch || !providerCanSeeBatch(provider, batch)) notFound();

  const stats = calculateBatchStats(batch);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/providers/batches" className="text-sm font-semibold text-ink/55 hover:text-ink">返回批次机会池</Link>
      <header className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink md:text-6xl">{batch.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">{batch.summary}</p>
          <p className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">推荐原因：{providerBatchRecommendationReason(provider, batch)}</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">批次目标</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {metric("作品", stats.workCount)}
            {metric("入选", stats.selectedWorkCount)}
            {metric("目标样衣", batch.targetSampleCount ?? "未定")}
            {metric("目标数量", batch.targetProductionQuantity ?? "未定")}
            {metric("确认数量", batch.confirmedProductionQuantity ? "已有确认" : "待验证")}
            {metric("预计面料", stats.estimatedFabricMeters ? `${stats.estimatedFabricMeters} 米` : "未定")}
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {metric("提交截止", dateText(batch.submissionDeadline))}
        {metric("目标完成", dateText(batch.targetCompletionDate))}
        {metric("补单预期", batch.expectedRepeatOrder ? "有可能" : "未明确")}
      </section>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">缺失资源提示</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.missingItems.length ? stats.missingItems.map((item) => (
            <span key={item} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{item}</span>
          )) : <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">资源较完整</span>}
        </div>
      </section>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">我的参与申请</h2>
        {batch.providers.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {batch.providers.map((item) => (
              <div key={item.id} className="rounded-[8px] bg-paper p-4">
                <p className="font-semibold text-ink">{BATCH_PROVIDER_ROLE_LABELS[item.role]}</p>
                <p className="mt-1 text-sm text-ink/52">{BATCH_PROVIDER_STATUS_LABELS[item.status]}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">{item.note ?? "说明待补充"}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-ink/55">你还没有提交参与申请。</p>}
        <div className="mt-5">
          <ProviderBatchApplyForm batchId={batch.id} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-semibold text-ink">入选与候选作品</h2>
        {batch.works.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {batch.works.filter((item) => item.status !== "REMOVED").map((item, index) => (
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
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">批次作品仍在评估中。</div>
        )}
      </section>
    </div>
  );
}
