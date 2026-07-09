import Link from "next/link";
import { CrowdSubmissionForm } from "@/components/incubation/CrowdSubmissionForm";
import { visualFor } from "@/components/works/work-visuals";
import { PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { PresaleCampaignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type PresalePageProps = {
  searchParams?: Promise<{
    workId?: string;
  }>;
};

async function getActiveCampaigns() {
  return prisma.presaleCampaign.findMany({
    where: {
      status: PresaleCampaignStatus.ACTIVE,
      work: approvedVisibleWorkWhere
    },
    include: {
      work: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          user: { include: { designerProfile: true } }
        }
      },
      _count: {
        select: {
          intents: true
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { currentCount: "desc" }, { createdAt: "desc" }],
    take: 24
  });
}

async function getLegacyPresaleWorks() {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { include: { designerProfile: true } },
      _count: {
        select: {
          presaleIntents: true
        }
      }
    },
    orderBy: [{ likeCount: "desc" }, { favoriteCount: "desc" }, { createdAt: "desc" }],
    take: 8
  });
}

export default async function PresalePage({ searchParams }: PresalePageProps) {
  const params = await searchParams;
  const [campaigns, legacyWorks] = await Promise.all([getActiveCampaigns(), getLegacyPresaleWorks()]);
  const selectedLegacyWork = params?.workId ? legacyWorks.find((work) => work.id === params.workId) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Presale Validation</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预售验证，不需要付款。</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60 md:text-base">
          这里展示的是用户购买意向验证，不收款，不构成订单。
        </p>
      </header>

      {selectedLegacyWork ? (
        <div className="mb-8">
          <CrowdSubmissionForm kind="presale" workId={selectedLegacyWork.id} workTitle={selectedLegacyWork.title} />
        </div>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Active Campaigns</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">正在验证的作品</h2>
          </div>
        </div>

        {campaigns.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign, index) => {
              const progress = presaleProgress(campaign.currentCount, campaign.targetCount);
              return (
                <article key={campaign.id} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
                  <img src={visualFor(index, campaign.work.images[0])} alt={campaign.work.title} className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PRESALE_CAMPAIGN_STATUS_LABELS[campaign.status]}</span>
                      {campaign.isFeatured ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">推荐</span> : null}
                    </div>
                    <div>
                      <h3 className="line-clamp-2 text-lg font-semibold text-ink">{campaign.title}</h3>
                      <p className="mt-2 line-clamp-1 text-sm text-ink/52">{campaign.work.title} / {campaign.work.user.nickname}</p>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink/45">
                        <span>已有 {campaign.currentCount} 人，目标 {campaign.targetCount} 人</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <p className="text-sm text-ink/55">预计价格：{campaign.estimatedPrice ?? "待定"}</p>
                    <Link href={`/works/${campaign.workId}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                      查看作品并提交意向
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预售验证作品，平台正在筛选首批作品。</div>
        )}
      </section>
    </div>
  );
}
