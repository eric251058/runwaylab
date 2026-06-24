import Link from "next/link";
import type { Challenge } from "@prisma/client";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";

type ChallengeHeroProps = {
  challenge: Challenge | null;
  entryCount?: number;
};

function daysLeft(date?: Date) {
  if (!date) return "进行中";
  const diff = date.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86_400_000));
  return days > 0 ? `${days} 天` : "收官中";
}

export function ChallengeHero({ challenge, entryCount = 0 }: ChallengeHeroProps) {
  const title = challenge?.title || "第一届「设计上岸」新人设计挑战";
  const theme = challenge?.theme || "让你的设计从作业变成机会";
  const href = challenge ? `/challenges/${challenge.id}` : "/challenges";

  return (
    <section className="relative overflow-hidden rounded-[6px] bg-ink p-5 text-white shadow-[0_22px_70px_rgba(16,16,16,0.18)] md:p-7">
      <div className="absolute right-0 top-0 h-full w-1.5 bg-accent" />
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-accent">
            <Trophy size={14} />
            第一届「设计上岸」新人设计挑战
          </div>
          <h2 className="mt-4 text-2xl font-semibold leading-tight md:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/64">{theme}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[520px]">
          <div className="rounded-[6px] bg-white/10 p-4">
            <div className="flex items-center gap-2 text-xs text-white/55">
              <CalendarDays size={14} />
              倒计时
            </div>
            <p className="mt-2 text-xl font-semibold text-white">{daysLeft(challenge?.endAt)}</p>
          </div>
          <div className="rounded-[6px] bg-white/10 p-4">
            <p className="text-xs text-white/55">参赛作品数</p>
            <p className="mt-2 text-xl font-semibold text-white">{entryCount}</p>
          </div>
          <div className="rounded-[6px] bg-white/10 p-4">
            <p className="text-xs text-white/55">曝光权益</p>
            <p className="mt-2 text-xl font-semibold text-white">Top 10</p>
          </div>
          <div className="rounded-[6px] bg-white/10 p-4">
            <p className="text-xs text-white/55">孵化机会</p>
            <p className="mt-2 text-xl font-semibold text-white">候选池</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-ink">
          立即参赛
        </Link>
        <Link href={href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white">
          查看排行榜
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
