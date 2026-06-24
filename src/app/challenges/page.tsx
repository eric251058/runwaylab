import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChallengeHero } from "@/components/challenges/ChallengeHero";
import { RankingList } from "@/components/challenges/RankingList";
import { WorkMasonry } from "@/components/works/WorkMasonry";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { getActiveChallenge, getChallengeEntryCount, getPublicChallengeEntries } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const data = await (async () => {
    const challenge = await getActiveChallenge();
    if (!challenge) return null;
    const [entryCount, entries] = await Promise.all([getChallengeEntryCount(challenge.id), getPublicChallengeEntries(challenge.id)]);
    return { challenge, entryCount, entries };
  })().catch((error) => {
    console.error("Failed to load challenge page", error);
    return undefined;
  });

  if (data === undefined) {
    return <DataUnavailable title="挑战赛数据暂时没有读到" />;
  }

  if (!data) {
    return <DataUnavailable title="当前挑战即将开启" />;
  }

  const works = data.entries.map((entry) => entry.work);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Challenge</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink md:text-6xl">新人设计挑战</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58 md:text-base">
          让新锐服装设计作品获得曝光、排名、面料匹配和打样孵化机会。
        </p>
      </header>

      <div className="space-y-12">
        <ChallengeHero challenge={data.challenge} entryCount={data.entryCount} />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <h2 className="text-lg font-semibold text-ink">参赛规则</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">{data.challenge.requirements}</p>
          </div>
          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <h2 className="text-lg font-semibold text-ink">奖励与机会</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">{data.challenge.rewards}</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <RankingList title="挑战排行榜" works={works} metric="popular" />
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Entries</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">参赛作品</h2>
              </div>
              <Link href={`/challenges/${data.challenge.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink">
                查看详情
                <ArrowRight size={15} />
              </Link>
            </div>
            <WorkMasonry works={works.slice(0, 8)} compact />
          </section>
        </div>
      </div>
    </div>
  );
}
