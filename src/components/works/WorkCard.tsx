import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import type { IncubationStatus } from "@prisma/client";
import { WorkQuickActions } from "@/components/works/WorkQuickActions";
import { WorkStatusBadge, getWorkBadges } from "@/components/works/WorkStatusBadge";
import { initials, visualFor, type WorkImageLike } from "@/components/works/work-visuals";
import { getHeatBadges, getHeatScore } from "@/lib/operation-growth";

export type WorkCardLike = {
  id: string;
  title: string;
  description: string;
  images: WorkImageLike[];
  user: {
    nickname: string;
    designerProfile?: {
      school?: string | null;
      city?: string | null;
    } | null;
  };
  challengeEntries?: unknown[];
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  incubationRecommendCount: number;
  isFeatured: boolean;
  isEditorPick: boolean;
  isOpenCoop: boolean;
  wantsIncubation: boolean;
  isAiAssisted: boolean;
  incubationStatus: IncubationStatus | null;
  likedByCurrentUser?: boolean;
  favoritedByCurrentUser?: boolean;
};

type WorkCardProps = {
  work: WorkCardLike & WorkCardSignals;
  index?: number;
  compact?: boolean;
};

type WorkCardCounts = {
  _count?: {
    presaleIntents?: number;
    presaleCampaigns?: number;
    fabricProposals?: number;
    fabricRecommendations?: number;
    sampleProposals?: number;
    factoryProposals?: number;
    buyerIntents?: number;
    providerWorkProposals?: number;
  };
};

type WorkCardSignals = WorkCardCounts & {
  school?: {
    name: string;
  } | null;
  teacher?: {
    name: string;
  } | null;
  teacherRecommendations?: unknown[];
  workIncubation?: {
    status?: string;
  } | null;
};

function shortText(value: string, max = 72) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function WorkCard({ work, index = 0, compact = false }: WorkCardProps) {
  const workSignals = work;
  const counts = workSignals._count;
  const profile = work.user.designerProfile;
  const imageUrl = visualFor(index, work.images[0]);
  const badges = getWorkBadges(work);
  const profileLine = [profile?.school, profile?.city].filter(Boolean).join(" / ");
  const resourceLine = (workSignals.school?.name ?? workSignals.teacher?.name ?? profileLine) || "新锐设计师";
  const hasPresale = Boolean((counts?.presaleCampaigns ?? 0) + (counts?.presaleIntents ?? 0));
  const hasFabric = Boolean((counts?.fabricRecommendations ?? 0) + (counts?.fabricProposals ?? 0));
  const hasProviderPlan = Boolean((counts?.providerWorkProposals ?? 0) + (counts?.sampleProposals ?? 0) + (counts?.factoryProposals ?? 0) + (counts?.buyerIntents ?? 0));
  const isIncubating = Boolean(work.wantsIncubation || work.incubationStatus || (workSignals.workIncubation && workSignals.workIncubation.status !== "DISPLAYING"));
  const statusBadges = [
    hasPresale ? "预售验证中" : null,
    isIncubating ? "孵化中" : null,
    workSignals.teacherRecommendations?.length ? "老师推荐" : null,
    hasFabric ? "面料已匹配" : null,
    hasProviderPlan ? "服务商方案" : null
  ].filter(Boolean) as string[];
  const heatSignals = {
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    commentCount: work.commentCount,
    presaleIntentCount: counts?.presaleIntents,
    fabricProposalCount: counts?.fabricProposals,
    sampleProposalCount: counts?.sampleProposals,
    factoryProposalCount: counts?.factoryProposals,
    buyerIntentCount: counts?.buyerIntents
  };
  const heatScore = getHeatScore(heatSignals);
  const heatBadges = getHeatBadges(heatSignals);

  return (
    <article className="mb-2 break-inside-avoid overflow-hidden rounded-[6px] bg-white shadow-[0_10px_30px_rgba(16,16,16,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(16,16,16,0.14)] md:mb-5 md:shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <Link href={`/works/${work.id}`} className="group block">
        <div className={compact ? "relative aspect-[4/5] overflow-hidden bg-zinc-200" : "relative aspect-[3/4] overflow-hidden bg-zinc-200 md:aspect-[4/5]"}>
          <img src={imageUrl} alt={work.title} className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 md:p-3">
            <div className="flex flex-wrap gap-1.5">
              {statusBadges.slice(0, 2).map((badge) => (
                <span key={`${work.id}-${badge}`} className="inline-flex rounded-full border border-white/25 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink">
                  {badge}
                </span>
              ))}
              {!statusBadges.length
                ? badges.slice(0, compact ? 1 : 2).map((badge) => (
                    <WorkStatusBadge key={`${work.id}-${badge.label}`} kind={badge.kind}>
                      {badge.label}
                    </WorkStatusBadge>
                  ))
                : null}
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-2 p-3 md:space-y-3 md:p-4">
        <div>
          <Link href={`/works/${work.id}`} className="block hover:text-ink/70">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink md:text-base">{work.title}</h3>
          </Link>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink/55 md:gap-2 md:text-xs">
            <div className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white sm:flex">
              {initials(work.user.nickname)}
            </div>
            <span className="shrink-0 font-medium text-ink/75">{work.user.nickname}</span>
            <span className="hidden truncate sm:inline">{resourceLine}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/50">{shortText(work.description)}</p>
        </div>

        <div className="grid grid-cols-3 gap-1 border-t border-black/5 pt-2 text-[10px] text-ink/60 md:gap-2 md:pt-3 md:text-[11px]">
          <Link href={`/works/${work.id}#comments`} className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-1 font-semibold hover:text-ink">
            <MessageCircle size={13} />
            评论 {work.commentCount}
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-1 font-semibold">
            <Sparkles size={13} />
            推荐 {work.incubationRecommendCount}
          </span>
          <span className="inline-flex items-center justify-center rounded-full bg-ink px-2 py-1 font-semibold text-white">热度 {heatScore}</span>
        </div>

        {heatBadges.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {heatBadges.slice(0, compact ? 1 : 2).map((badge) => (
              <span key={badge} className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink/55">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <WorkQuickActions
        workId={work.id}
        title={work.title}
        initialLikeCount={work.likeCount}
        initialFavoriteCount={work.favoriteCount}
        initialLiked={work.likedByCurrentUser}
        initialFavorited={work.favoritedByCurrentUser}
      />
    </article>
  );
}
