import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkIncubationStatus } from "@prisma/client";
import { WorkCard } from "@/components/works/WorkCard";
import { getHeatScore } from "@/lib/operation-growth";
import { prisma } from "@/lib/prisma";
import { isPublicQualityWork } from "@/lib/works/rules";
import { getPublicQualityWorkIds, type WorkCardData } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

const workInclude = {
  images: {
    orderBy: {
      sortOrder: "asc" as const
    }
  },
  user: {
    include: {
      designerProfile: true
    }
  },
  challengeEntries: {
    include: {
      challenge: true
    },
    take: 1
  },
  incubationProjects: {
    orderBy: {
      createdAt: "desc" as const
    },
    take: 1
  },
  incubationApplications: {
    take: 1
  },
  workIncubation: true,
  _count: {
    select: {
      presaleIntents: true,
      fabricProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true
    }
  }
};

type RankingWork = Awaited<ReturnType<typeof getRankingWorks>>[number];

async function getRankingWorks() {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return [];

  const works = await prisma.work.findMany({
    where: {
      id: {
        in: qualityWorkIds
      }
    },
    include: workInclude,
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });
  return works.filter(isPublicQualityWork);
}

function heatOf(work: RankingWork) {
  return getHeatScore({
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    commentCount: work.commentCount,
    presaleIntentCount: work._count.presaleIntents,
    fabricProposalCount: work._count.fabricProposals,
    sampleProposalCount: work._count.sampleProposals,
    factoryProposalCount: work._count.factoryProposals,
    buyerIntentCount: work._count.buyerIntents
  });
}

function asWorkCard(work: RankingWork) {
  return work as unknown as WorkCardData;
}

function RankingSection({ title, works, emptyText }: { title: string; works: RankingWork[]; emptyText: string }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
          作品库 <ArrowRight size={15} />
        </Link>
      </div>
      {works.length ? (
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {works.slice(0, 8).map((work, index) => (
            <WorkCard key={work.id} work={asWorkCard(work)} index={index} compact />
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">{emptyText}</div>
      )}
    </section>
  );
}

export default async function RankingsPage() {
  const works = await getRankingWorks();
  const qualityWorkIds = await getPublicQualityWorkIds();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyHot = works.filter((work) => work.createdAt >= weekAgo).sort((a, b) => heatOf(b) - heatOf(a));
  const latestWorks = works.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const incubationCandidates = works
    .filter((work) => work.workIncubation?.status === WorkIncubationStatus.CANDIDATE || work.wantsIncubation || work.incubationStatus)
    .sort((a, b) => heatOf(b) - heatOf(a));
  const presaleRank = works.slice().sort((a, b) => b._count.presaleIntents - a._count.presaleIntents);
  const buyerRank = works.slice().sort((a, b) => b._count.buyerIntents - a._count.buyerIntents);

  const designers = qualityWorkIds.length ? await prisma.user.findMany({
    where: {
      works: {
        some: {
          id: {
            in: qualityWorkIds
          }
        }
      }
    },
    include: {
      designerProfile: true,
      works: {
        where: {
          id: {
            in: qualityWorkIds
          }
        },
        include: {
          _count: {
            select: {
              presaleIntents: true,
              fabricProposals: true,
              sampleProposals: true,
              factoryProposals: true,
              buyerIntents: true
            }
          }
        }
      }
    },
    take: 40
  }) : [];
  const designerRank = designers
    .map((designer) => ({
      id: designer.id,
      nickname: designer.nickname,
      school: designer.designerProfile?.school,
      city: designer.designerProfile?.city,
      workCount: designer.works.length,
      score: designer.works.reduce(
        (sum, work) =>
          sum +
          getHeatScore({
            likeCount: work.likeCount,
            favoriteCount: work.favoriteCount,
            commentCount: work.commentCount,
            presaleIntentCount: work._count.presaleIntents,
            fabricProposalCount: work._count.fabricProposals,
            sampleProposalCount: work._count.sampleProposals,
            factoryProposalCount: work._count.factoryProposals,
            buyerIntentCount: work._count.buyerIntents
          }),
        0
      )
    }))
    .sort((a, b) => b.workCount * 10 + b.score - (a.workCount * 10 + a.score))
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Rankings</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">RunwayLab 榜单</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58 md:text-base">
          榜单基于真实点赞、收藏、评论、预售意向和产业方案数计算，不写死假数据。
        </p>
      </header>

      <div className="space-y-12">
        <RankingSection title="本周热门作品" works={weeklyHot.length ? weeklyHot : works.slice().sort((a, b) => heatOf(b) - heatOf(a))} emptyText="暂无热门作品。" />
        <RankingSection title="最新发布作品" works={latestWorks} emptyText="暂无最新作品。" />
        <RankingSection title="孵化候选作品" works={incubationCandidates} emptyText="暂无孵化候选作品。" />
        <RankingSection title="预售意向榜" works={presaleRank.filter((work) => work._count.presaleIntents > 0)} emptyText="暂无预售意向数据。" />
        <RankingSection title="采购关注榜" works={buyerRank.filter((work) => work._count.buyerIntents > 0)} emptyText="暂无采购关注数据。" />

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">新锐设计师榜</h2>
          {designerRank.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {designerRank.map((designer, index) => (
                <Link key={designer.id} href={`/designers/${designer.id}`} className="flex items-center justify-between gap-4 rounded-[8px] border border-black/8 bg-white p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">#{index + 1} {designer.nickname}</p>
                    <p className="mt-1 truncate text-xs text-ink/48">{[designer.school, designer.city].filter(Boolean).join(" / ") || "新锐设计师"}</p>
                  </div>
                  <div className="text-right text-xs text-ink/48">
                    <p>{designer.workCount} 件作品</p>
                    <p className="mt-1 font-semibold text-ink">热度 {designer.score}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无设计师榜单数据。</div>
          )}
        </section>
      </div>
    </div>
  );
}
