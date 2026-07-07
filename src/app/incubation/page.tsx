import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bookmark, Heart, MessageCircle, Sparkles } from "lucide-react";
import { IncubationProgress } from "@/components/incubation/IncubationProgress";
import { visualFor } from "@/components/works/work-visuals";
import { canEnterIncubationCandidate, incubationStatusLabels } from "@/lib/incubation";
import { getHeatBadges, getHeatScore } from "@/lib/operation-growth";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { WorkIncubationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const sections = [
  { key: WorkIncubationStatus.CANDIDATE, title: "孵化候选作品", empty: "暂时还没有孵化候选作品" },
  { key: WorkIncubationStatus.FABRIC_MATCHING, title: "寻找面料中的作品", empty: "暂时还没有寻找面料中的作品" },
  { key: WorkIncubationStatus.SAMPLE_MATCHING, title: "寻找打样中的作品", empty: "暂时还没有寻找打样中的作品" },
  { key: WorkIncubationStatus.PRESALE_TESTING, title: "预售意向中的作品", empty: "暂时还没有预售意向中的作品" }
];

type IncubationWork = Awaited<ReturnType<typeof getIncubationWorks>>[number];

async function getIncubationWorks() {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      user: {
        include: {
          designerProfile: true
        }
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
    },
    orderBy: [{ incubationRecommendCount: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
    take: 60
  });
}

function effectiveStatus(work: IncubationWork) {
  const storedStatus = work.workIncubation?.status;

  if (storedStatus && storedStatus !== WorkIncubationStatus.DISPLAYING) {
    return storedStatus;
  }

  if (
    canEnterIncubationCandidate({
      likeCount: work.likeCount,
      favoriteCount: work.favoriteCount,
      presaleIntentCount: work._count.presaleIntents,
      buyerIntentCount: work._count.buyerIntents
    })
  ) {
    return WorkIncubationStatus.CANDIDATE;
  }

  return storedStatus ?? WorkIncubationStatus.DISPLAYING;
}

function metric(icon: ReactNode, label: string, value: number) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink/60">
      {icon}
      {label} {value}
    </span>
  );
}

function IncubationCard({ work, index }: { work: IncubationWork; index: number }) {
  const status = effectiveStatus(work);
  const profile = work.user.designerProfile;
  const heatSignals = {
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    commentCount: work.commentCount,
    presaleIntentCount: work._count.presaleIntents,
    fabricProposalCount: work._count.fabricProposals,
    sampleProposalCount: work._count.sampleProposals,
    factoryProposalCount: work._count.factoryProposals,
    buyerIntentCount: work._count.buyerIntents
  };
  const heatScore = getHeatScore(heatSignals);
  const heatBadges = getHeatBadges(heatSignals);

  return (
    <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
      <img src={visualFor(index, work.images[0])} alt={work.title} className="aspect-[4/3] w-full object-cover" />
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold text-ink">{work.title}</h3>
            <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{incubationStatusLabels[status]}</span>
          </div>
          <p className="mt-2 text-sm text-ink/52">
            {work.user.nickname}
            {profile?.school || profile?.city ? ` / ${[profile?.school, profile?.city].filter(Boolean).join(" / ")}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {metric(<Heart size={12} />, "点赞", work.likeCount)}
          {metric(<Bookmark size={12} />, "收藏", work.favoriteCount)}
          {metric(<MessageCircle size={12} />, "评论", work.commentCount)}
          {metric(<Sparkles size={12} />, "预售", work._count.presaleIntents)}
          {metric(null, "面料", work._count.fabricProposals)}
          {metric(null, "打样", work._count.sampleProposals)}
          {metric(null, "采购", work._count.buyerIntents)}
        </div>

        <IncubationProgress status={status} />

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">热度 {heatScore}</span>
          {heatBadges.slice(0, 2).map((badge) => (
            <span key={badge} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">
              {badge}
            </span>
          ))}
        </div>

        <Link href={`/works/${work.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
          查看作品
        </Link>
      </div>
    </article>
  );
}

export default async function IncubationPage() {
  const works = await getIncubationWorks();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-ink p-6 text-white md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Crowd Incubation Pool</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">让作品被大众和产业一起推进。</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
          平台维护规则，设计师自己查看预售、面料、打样、生产和采购方案，并决定是否采纳。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/partners" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink">
            合作方入口 <ArrowRight size={15} />
          </Link>
          <Link href="/presale" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white">
            预售意向池 <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <div className="mt-10 space-y-12">
        {sections.map((section) => {
          const sectionWorks = works.filter((work) => effectiveStatus(work) === section.key).slice(0, 12);

          return (
            <section key={section.key}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">{section.key}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{section.title}</h2>
                </div>
              </div>
              {sectionWorks.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionWorks.map((work, index) => (
                    <IncubationCard key={work.id} work={work} index={index} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">{section.empty}</div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
