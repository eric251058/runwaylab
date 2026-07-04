import type { WorkCardData } from "@/lib/works/queries";
import { WorkCard } from "@/components/works/WorkCard";

type WorkMasonryProps = {
  works: WorkCardData[];
  compact?: boolean;
  emptyText?: string;
};

export function WorkMasonry({ works, compact = false, emptyText = "暂时还没有可展示的作品" }: WorkMasonryProps) {
  if (!works.length) {
    return <div className="rounded-[6px] border border-dashed border-black/15 px-6 py-12 text-center text-sm text-ink/55">{emptyText}</div>;
  }

  return (
    <div className="columns-2 gap-2 md:columns-3 md:gap-4 lg:columns-4">
      {works.map((work, index) => (
        <WorkCard key={work.id} work={work} index={index} compact={compact} />
      ))}
    </div>
  );
}
