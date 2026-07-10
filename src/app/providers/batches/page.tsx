import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderBatchApplyForm } from "@/components/batches/ProviderBatchApplyForm";
import { getCurrentUser } from "@/lib/auth/session";
import {
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  providerBatchRecommendationReason,
  providerCanSeeBatch,
  publicBatchWhere
} from "@/lib/incubation-batches";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function metric(label: string, value: string | number) {
  return (
    <span className="rounded-[6px] bg-white px-3 py-2 text-xs font-semibold text-ink/55">
      {label}：{value}
    </span>
  );
}

export default async function ProviderBatchesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/providers/batches");
  }

  const provider = await getProviderForUser(user);

  if (!provider) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-[8px] border border-black/8 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Batch Opportunities</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">请先完成服务商入驻和资料审核</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">批次机会仅向已审核服务商开放。当前轻量关联方式为服务商联系邮箱与登录邮箱一致。</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/providers/apply" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">服务商入驻</Link>
            <Link href="/me/provider-profile" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-ink">完善服务能力</Link>
          </div>
        </div>
      </div>
    );
  }

  const batches = await prisma.incubationBatch.findMany({
    where: publicBatchWhere(),
    include: {
      works: {
        include: {
          work: {
            include: {
              images: { take: 1 },
              teacherRecommendations: true,
              fabricRecommendations: true,
              providerWorkProposals: true,
              presaleCampaignIntents: true,
              buyerIntents: true,
              votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
              opportunityProfile: true
            }
          }
        }
      },
      providers: {
        where: { providerId: provider.id }
      }
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 80
  });
  const visibleBatches = batches.filter((batch) => providerCanSeeBatch(provider, batch));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Batch Pool</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">批次机会池</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">这里只展示与你服务能力、接单偏好和批次阶段匹配的聚合机会。</p>
        </div>
        <Link href="/me/provider-profile" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink sm:w-fit">完善服务能力</Link>
      </header>

      {visibleBatches.length ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {visibleBatches.map((batch) => {
            const stats = calculateBatchStats(batch);
            return (
              <article key={batch.id} className="rounded-[8px] border border-black/8 bg-paper p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
                  {batch.providers.length ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">已提交</span> : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-ink">{batch.title}</h2>
                <p className="mt-1 text-sm text-ink/52">{batch.organizerName}{batch.city ? ` / ${batch.city}` : ""}</p>
                <p className="mt-3 text-sm leading-6 text-ink/58">{batch.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {metric("作品", stats.workCount)}
                  {metric("入选", stats.selectedWorkCount)}
                  {metric("目标数量", batch.targetProductionQuantity ?? "未定")}
                  {metric("确认数量", batch.confirmedProductionQuantity ? "已有确认" : "待验证")}
                  {metric("预计面料", stats.estimatedFabricMeters ? `${stats.estimatedFabricMeters} 米` : "未定")}
                </div>
                <p className="mt-4 rounded-[6px] bg-white px-3 py-2 text-sm leading-6 text-ink/58">推荐原因：{providerBatchRecommendationReason(provider, batch)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/providers/batches/${batch.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">查看批次机会</Link>
                  <Link href={`/batches/${batch.slug}`} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">公开页</Link>
                </div>
                <ProviderBatchApplyForm batchId={batch.id} />
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          暂无与你能力匹配的批次机会。你可以先完善服务能力，或等待平台审核更多批次。
        </div>
      )}
    </div>
  );
}
