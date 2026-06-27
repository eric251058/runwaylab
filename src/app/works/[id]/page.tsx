import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { WorkImageCarousel } from "@/components/works/WorkImageCarousel";
import { WorkInteractionBar } from "@/components/works/WorkInteractionBar";
import { WorkStatusBadge, getWorkBadges } from "@/components/works/WorkStatusBadge";
import { initials } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewWorkDetail } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getWorkDetailById } from "@/lib/works/queries";

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

function incubationLabel(value?: string | null) {
  const labels: Record<string, string> = {
    CANDIDATE: "孵化候选",
    REVIEWING: "编辑评估",
    FABRIC_MATCHING: "面料匹配中",
    SAMPLE_EVALUATING: "打样评估中",
    SAMPLE_MAKING: "打样中",
    COMPLETED: "已完成"
  };

  return value ? labels[value] ?? "孵化跟进中" : "未进入孵化";
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
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <Link href="/works" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft size={16} />
        返回作品库
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <WorkImageCarousel images={work.images} title={work.title} />

        <section className="space-y-6">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <WorkStatusBadge key={badge.label} kind={badge.kind}>
                  {badge.label}
                </WorkStatusBadge>
              ))}
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-ink md:text-5xl">{work.title}</h1>
            <p className="mt-4 text-base leading-7 text-ink/62">{work.description}</p>
          </div>

          <Link href={`/designers/${work.user.id}`} className="flex items-center gap-4 rounded-[6px] bg-white p-4 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <div className="flex size-14 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(work.user.nickname)}</div>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{work.user.nickname}</p>
              <p className="mt-1 truncate text-sm text-ink/50">
                {[profile?.school, profile?.city, profile?.designDirection].filter(Boolean).join(" / ") || "新锐设计师"}
              </p>
            </div>
          </Link>

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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {field("品类", work.category)}
            {field("作品类型", work.workType)}
            {field("AI 辅助", work.isAiAssisted)}
            {field("开放合作", work.isOpenCoop)}
            {field("参赛状态", activeChallenge ? `参赛中：${activeChallenge.title}` : "未参赛")}
            {field("孵化状态", incubationLabel(incubationProject?.status ?? work.incubationStatus))}
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
