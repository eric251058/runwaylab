import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Sparkles } from "lucide-react";
import type { WorkCardData } from "@/lib/works/queries";
import { WorkStatusBadge, getWorkBadges } from "@/components/works/WorkStatusBadge";
import { initials, visualFor } from "@/components/works/work-visuals";

type WorkCardProps = {
  work: WorkCardData;
  index?: number;
  compact?: boolean;
};

export function WorkCard({ work, index = 0, compact = false }: WorkCardProps) {
  const profile = work.user.designerProfile;
  const imageUrl = visualFor(index, work.images[0]);
  const badges = getWorkBadges(work);
  const location = [profile?.school, profile?.city].filter(Boolean).join(" / ") || "新锐设计师";

  return (
    <Link
      href={`/works/${work.id}`}
      className="group mb-5 block break-inside-avoid overflow-hidden rounded-[6px] bg-white shadow-[0_18px_50px_rgba(16,16,16,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(16,16,16,0.14)]"
    >
      <div className="relative overflow-hidden bg-zinc-200">
        <img
          src={imageUrl}
          alt={work.title}
          className={compact ? "aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105" : "aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105"}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex flex-wrap gap-1.5">
            {badges.slice(0, 4).map((badge) => (
              <WorkStatusBadge key={`${work.id}-${badge.label}`} kind={badge.kind}>
                {badge.label}
              </WorkStatusBadge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">{work.title}</h3>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink/55">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
              {initials(work.user.nickname)}
            </div>
            <span className="shrink-0 font-medium text-ink/75">{work.user.nickname}</span>
            <span className="truncate">{location}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 border-t border-black/5 pt-3 text-[11px] text-ink/60">
          <span className="inline-flex items-center gap-1">
            <Heart size={13} />
            {work.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bookmark size={13} />
            {work.favoriteCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={13} />
            {work.commentCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles size={13} />
            {work.incubationRecommendCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
