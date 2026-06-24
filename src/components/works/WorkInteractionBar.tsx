import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Share2, Sparkles, SwatchBook, WandSparkles } from "lucide-react";

type WorkInteractionBarProps = {
  workId: string;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  shareCount: number;
  incubationRecommendCount: number;
};

const staticActions = [
  { label: "点赞", icon: Heart },
  { label: "收藏", icon: Bookmark },
  { label: "评论", icon: MessageCircle },
  { label: "分享", icon: Share2 },
  { label: "推荐孵化", icon: Sparkles }
];

export function WorkInteractionBar({
  workId,
  likeCount,
  favoriteCount,
  commentCount,
  shareCount,
  incubationRecommendCount
}: WorkInteractionBarProps) {
  const counts = [likeCount, favoriteCount, commentCount, shareCount, incubationRecommendCount];

  return (
    <aside className="space-y-3 rounded-[6px] bg-white p-4 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="grid grid-cols-5 gap-2">
        {staticActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[5px] border border-black/8 bg-paper/60 text-xs font-medium text-ink transition hover:border-ink/30 hover:bg-white"
            >
              <Icon size={17} />
              <span>{action.label}</span>
              <span className="text-[10px] text-ink/45">{counts[index]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href={`/incubation/fabric-request?workId=${workId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white">
          <SwatchBook size={16} />
          找相似面料
        </Link>
        <Link href={`/incubation/sample-request?workId=${workId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-ink">
          <WandSparkles size={16} />
          申请打样评估
        </Link>
        <button type="button" className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold text-ink">
          开放合作意向
        </button>
      </div>
    </aside>
  );
}
