import Link from "next/link";
import { ArrowUpRight, Flame, Sparkles } from "lucide-react";
import type { WorkCardData } from "@/lib/works/queries";
import { visualFor } from "@/components/works/work-visuals";

type RankingListProps = {
  title: string;
  works: WorkCardData[];
  metric: "popular" | "incubation";
};

export function RankingList({ title, works, metric }: RankingListProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Ranking</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
        </div>
        <Link href="/works?sort=popular" className="hidden text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
          全部作品
        </Link>
      </div>

      <div className="divide-y divide-black/8 rounded-[6px] bg-white shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
        {works.slice(0, 6).map((work, index) => {
          const score =
            metric === "popular"
              ? work.likeCount + work.favoriteCount + work.commentCount + work.shareCount
              : work.incubationRecommendCount;
          const Icon = metric === "popular" ? Flame : Sparkles;

          return (
            <Link key={work.id} href={`/works/${work.id}`} className="grid grid-cols-[36px_64px_1fr_auto] items-center gap-3 p-3 transition hover:bg-paper/70">
              <div className="text-lg font-semibold text-ink/35">{String(index + 1).padStart(2, "0")}</div>
              <img src={visualFor(index, work.images[0]?.imageUrl)} alt={work.title} className="aspect-square rounded-[4px] object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{work.title}</p>
                <p className="mt-1 truncate text-xs text-ink/50">{work.user.nickname}</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon size={15} />
                {score}
                <ArrowUpRight size={14} className="text-ink/35" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
