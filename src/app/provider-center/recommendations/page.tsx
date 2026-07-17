import Link from "next/link";
import { redirect } from "next/navigation";
import { RecommendationStatus } from "@prisma/client";
import { SafeImage } from "@/components/media/SafeImage";
import { ProviderRecommendationActions } from "@/components/provider-center/ProviderRecommendationActions";
import { FABRIC_RECOMMENDATION_STATUS_LABELS, recommendationConditionText } from "@/lib/fabric-recommendation-shared";
import { recommendationInclude } from "@/lib/fabric-recommendations";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { PROVIDER_PROPOSAL_STATUS_LABELS, PROVIDER_PROPOSAL_TYPE_LABELS } from "@/lib/provider-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusClass(status: string) {
  if (status === RecommendationStatus.INTERESTED || status === RecommendationStatus.ACCEPTED || status === "ACCEPTED" || status === "SHORTLISTED") return "bg-ink text-white";
  if (status === RecommendationStatus.NOT_SUITABLE || status === RecommendationStatus.REJECTED || status === "REJECTED") return "bg-zinc-100 text-ink/55";
  if (status === RecommendationStatus.WITHDRAWN) return "bg-paper text-ink/40";
  return "bg-white text-ink/58";
}

export default async function ProviderRecommendationsPage() {
  const { provider } = await getProviderCenterContext("/provider-center/recommendations");
  if (!provider) redirect("/providers/apply");

  const [fabricRecommendations, serviceRecommendations] = await Promise.all([
    prisma.workFabricRecommendation.findMany({
      where: { providerId: provider.id },
      include: recommendationInclude(),
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.providerWorkProposal.findMany({
      where: { providerId: provider.id },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const items = [
    ...fabricRecommendations.map((item) => ({ kind: "fabric" as const, createdAt: item.createdAt, item })),
    ...serviceRecommendations.map((item) => ({ kind: "service" as const, createdAt: item.createdAt, item }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 rounded-[8px] bg-white p-5 md:flex-row md:items-end md:justify-between md:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Recommendations</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">我的推荐</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">查看你从作品详情页提交的面料、打样、生产、辅料和工艺建议。</p>
        </div>
        <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          返回工作台
        </Link>
      </header>

      {items.length ? (
        <section className="grid gap-4">
          {items.map((entry) => {
            if (entry.kind === "fabric") {
              const recommendation = entry.item;
              const workImage = recommendation.work.images[0]?.imageUrl;
              const condition = recommendationConditionText(recommendation);

              return (
                <article key={`fabric-${recommendation.id}`} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_14px_42px_rgba(16,16,16,0.07)]">
                  <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                    <Link href={`/works/${recommendation.work.id}`} className="block">
                      <SafeImage src={workImage} alt={recommendation.work.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" placeholder="作品图片" />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(recommendation.status)}`}>
                          {FABRIC_RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                        </span>
                        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/45">{formatDate(recommendation.createdAt)}</span>
                        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/45">面料推荐</span>
                      </div>
                      <h2 className="mt-3 truncate text-lg font-semibold text-ink">
                        <Link href={`/works/${recommendation.work.id}`} className="hover:text-ink/70">
                          {recommendation.work.title}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-ink/52">
                        推荐面料：
                        <Link href={`/fabrics/${recommendation.fabric.slug ?? recommendation.fabric.id}`} className="font-semibold text-ink hover:text-ink/70">
                          {recommendation.fabric.name}
                        </Link>
                      </p>
                      {recommendation.reason ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{recommendation.reason}</p> : null}
                      {condition ? <p className="mt-2 text-xs font-semibold text-ink/42">{condition}</p> : null}
                      <ProviderRecommendationActions
                        workId={recommendation.work.id}
                        recommendationId={recommendation.id}
                        canWithdraw={recommendation.status === RecommendationStatus.PENDING}
                      />
                    </div>
                  </div>
                </article>
              );
            }

            const proposal = entry.item;
            const workImage = proposal.work.images[0]?.imageUrl;
            return (
              <article key={`service-${proposal.id}`} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_14px_42px_rgba(16,16,16,0.07)]">
                <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                  <Link href={`/works/${proposal.work.id}`} className="block">
                    <SafeImage src={workImage} alt={proposal.work.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" placeholder="作品图片" />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(proposal.status)}`}>
                        {PROVIDER_PROPOSAL_STATUS_LABELS[proposal.status]}
                      </span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/45">{formatDate(proposal.createdAt)}</span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/45">{PROVIDER_PROPOSAL_TYPE_LABELS[proposal.type]}</span>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-semibold text-ink">
                      <Link href={`/works/${proposal.work.id}`} className="hover:text-ink/70">
                        {proposal.work.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-ink">{proposal.title}</p>
                    {proposal.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{proposal.description}</p> : null}
                    <p className="mt-2 text-xs font-semibold text-ink/42">
                      {[proposal.estimatedPrice, proposal.moq, proposal.estimatedTime].filter(Boolean).join(" / ") || "等待设计师查看"}
                    </p>
                    <Link href={`/works/${proposal.work.id}`} className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white">
                      查看作品
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          你还没有向设计师推荐产品或服务。打开作品详情页后，可以直接提交适合当前作品的面料、打样、生产或工艺建议。
          <Link href="/works" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
            去浏览作品
          </Link>
        </section>
      )}
    </div>
  );
}
