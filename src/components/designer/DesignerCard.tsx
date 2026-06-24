import Link from "next/link";
import type { RecommendedDesigner } from "@/lib/works/queries";
import { initials, visualFor } from "@/components/works/work-visuals";

type DesignerCardProps = {
  designer: RecommendedDesigner;
  index?: number;
};

export function DesignerCard({ designer, index = 0 }: DesignerCardProps) {
  const user = designer.user;
  const location = [designer.school, designer.city].filter(Boolean).join(" / ") || "独立设计师";

  return (
    <Link href={`/designers/${user.id}`} className="group block overflow-hidden rounded-[6px] bg-white shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="relative h-28 overflow-hidden bg-zinc-200">
        <img src={visualFor(index, designer.portfolioCoverUrl)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="relative -mt-7 p-4 pt-0">
        <div className="flex size-14 items-center justify-center rounded-full border-4 border-white bg-ink text-sm font-semibold text-white">
          {initials(user.nickname)}
        </div>
        <h3 className="mt-3 text-base font-semibold text-ink">{user.nickname}</h3>
        <p className="mt-1 text-xs text-ink/55">{location}</p>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink/58">{designer.designDirection ?? designer.bio ?? "关注新锐服装设计表达"}</p>
        <div className="mt-4 text-xs font-semibold text-ink/40">{user._count.works} 件已发布作品</div>
      </div>
    </Link>
  );
}
