import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { WorkImageCarousel } from "@/components/works/WorkImageCarousel";
import { WorkInteractionBar } from "@/components/works/WorkInteractionBar";
import { WorkStatusBadge, getWorkBadges } from "@/components/works/WorkStatusBadge";
import { initials } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { getIncubationRuleText, incubationStatusLabels } from "@/lib/incubation";
import { canViewWorkDetail } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getWorkDetailById } from "@/lib/works/queries";
import { WorkIncubationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type WorkDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function field(label: string, value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="rounded-[6px] border border-black/8 bg-white/70 p-4">
      <p className="text-xs font-semibold text-ink/35">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{typeof value === "boolean" ? (value ? "是" : "否") : value}</p>
    </div>
  );
}

function legacyIncubationLabel(value?: string | null) {
  const labels: Record<string, string> = {
    CANDIDATE: "孵化候选",
    REVIEWING: "编辑评估",
    NOT_SUITABLE: "暂不适合",
    FABRIC_MATCHING: "面料匹配中",
    SAMPLE_EVALUATING: "打样评估中",
    QUOTE_DISCUSSING: "报价沟通中",
    PATTERN_EVALUATING: "版型评估中",
    SAMPLE_MAKING: "打样中",
    COOPERATION_DISCUSSING: "合作沟通中",
    COMPLETED: "已完成"
  };

  return value ? labels[value] ?? "孵化跟进中" : "未进入孵化";
}

function crowdIncubationStatus(value?: string | null) {
  if (value === "FABRIC_MATCHING") return WorkIncubationStatus.FABRIC_MATCHING;
  if (value === "SAMPLE_EVALUATING" || value === "SAMPLE_MAKING") return WorkIncubationStatus.SAMPLE_MATCHING;
  if (value === "COMPLETED") return WorkIncubationStatus.COLLABORATION_REACHED;
  if (value === "CANDIDATE" || value === "REVIEWING") return WorkIncubationStatus.CANDIDATE;
  return WorkIncubationStatus.DISPLAYING;
}

function progressMetric(label: string, value: number) {
  return (
    <div className="rounded-[6px] border border-black/8 bg-paper p-3">
      <p className="text-xs font-semibold text-ink/42">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const work = await getWorkDetailById(id).catch((error) => {
    console.error("Failed to load work detail", error);
    return undefined;
  });

  if (work === undefined) {
    return <DataUnavailable title="作品详情暂时没有读到" />;
  }

  if (!work) {
    notFound();
  }

  if (!canViewWorkDetail(currentUser, work)) {
    notFound();
  }

  const profile = work.user.designerProfile;
  const badges = getWorkBadges(work);
  const activeChallenge = work.challengeEntries[0]?.challenge;
  const incubationProject = work.incubationProjects[0];
  const [workIncubation, presaleIntentCount, fabricProposalCount, sampleProposalCount, factoryProposalCount, buyerIntentCount] = await Promise.all([
    prisma.workIncubation.findUnique({
      where: {
        workId: work.id
      }
    }),
    prisma.presaleIntent.count({
      where: {
        workId: work.id
      }
    }),
    prisma.fabricProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.sampleProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.factoryProposal.count({
      where: {
        workId: work.id
      }
    }),
    prisma.buyerIntent.count({
      where: {
        workId: work.id
      }
    })
  ]);
  const crowdStatus = workIncubation?.status ?? crowdIncubationStatus(incubationProject?.status ?? work.incubationStatus);
  const ruleText = getIncubationRuleText({
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    presaleIntentCount,
    buyerIntentCount
  });
  const [liked, favorited, incubationRecommended] = currentUser
    ? await Promise.all([
        prisma.like.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        }),
        prisma.favorite.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        }),
        prisma.incubationRecommendation.findUnique({
          where: {
            userId_workId: {
              userId: currentUser.id,
              workId: work.id
            }
          },
          select: { id: true }
        })
      ])
    : [null, null, null];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-10">
      <Link href="/works" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink md:mb-5">
        <ArrowLeft size={16} />
        返回作品库
      </Link>

      <div className="grid gap-5 md:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <WorkImageCarousel images={work.images} title={work.title} />

        <section className="space-y-4 md:space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 md:mb-4">
              {badges.map((badge) => (
                <WorkStatusBadge key={badge.label} kind={badge.kind}>
                  {badge.label}
                </WorkStatusBadge>
              ))}
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">{work.title}</h1>
            <p className="mt-3 text-sm leading-6 text-ink/62 md:mt-4 md:text-base md:leading-7">{work.description}</p>
          </div>

          <Link href={`/designers/${work.user.id}`} className="flex items-center gap-3 rounded-[6px] bg-white p-3 shadow-[0_12px_34px_rgba(16,16,16,0.08)] md:gap-4 md:p-4 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex size-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white md:size-14">{initials(work.user.nickname)}</div>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{work.user.nickname}</p>
              <p className="mt-1 truncate text-sm text-ink/50">
                {[profile?.school, profile?.city, profile?.designDirection].filter(Boolean).join(" / ") || "新锐设计师"}
              </p>
            </div>
          </Link>

          <div id="incubation-actions">
            <WorkInteractionBar
              workId={work.id}
              isLoggedIn={Boolean(currentUser)}
              initialLiked={Boolean(liked)}
              initialFavorited={Boolean(favorited)}
              initialIncubationRecommended={Boolean(incubationRecommended)}
              likeCount={work.likeCount}
              favoriteCount={work.favoriteCount}
              commentCount={work.commentCount}
              shareCount={work.shareCount}
              incubationRecommendCount={work.incubationRecommendCount}
              comments={work.comments.map((comment) => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                user: {
                  nickname: comment.user.nickname
                }
              }))}
            />
          </div>

          <section className="rounded-[8px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Incubation Progress</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">孵化进度</h2>
                <p className="mt-2 text-sm leading-6 text-ink/58">{ruleText}</p>
              </div>
              <span className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{incubationStatusLabels[crowdStatus]}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {progressMetric("点赞数", work.likeCount)}
              {progressMetric("收藏数", work.favoriteCount)}
              {progressMetric("评论数", work.commentCount)}
              {progressMetric("预售意向", presaleIntentCount)}
              {progressMetric("面料推荐", fabricProposalCount)}
              {progressMetric("打样方案", sampleProposalCount)}
              {progressMetric("工厂方案", factoryProposalCount)}
              {progressMetric("采购意向", buyerIntentCount)}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`/presale?workId=${work.id}`} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                我想预定
              </Link>
              <Link href={`/partners?workId=${work.id}&type=fabric`} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                我来推荐面料
              </Link>
              <Link href={`/partners?workId=${work.id}&type=sample`} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                我可以打样
              </Link>
              <Link href={`/partners?workId=${work.id}&type=factory`} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                我可以生产
              </Link>
              <Link href={`/partners?workId=${work.id}&type=buyer`} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                我想采购
              </Link>
              <a href="#incubation-actions" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                推荐进入孵化
              </a>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
            {field("品类", work.category)}
            {field("作品类型", work.workType)}
            {field("AI 辅助", work.isAiAssisted)}
            {field("开放合作", work.isOpenCoop)}
            {field("参赛状态", activeChallenge ? `参赛中：${activeChallenge.title}` : "未参赛")}
            {field("旧版孵化状态", legacyIncubationLabel(incubationProject?.status ?? work.incubationStatus))}
            {field("浏览量", work.viewCount)}
          </div>

          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              <Eye size={16} />
              风格标签
            </div>
            <div className="flex flex-wrap gap-2">
              {work.styleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-black/10 bg-paper px-3 py-1.5 text-xs font-semibold text-ink/58">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
