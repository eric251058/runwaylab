import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChallengeHero } from "@/components/challenges/ChallengeHero";
import { RankingList } from "@/components/challenges/RankingList";
import { WorkMasonry } from "@/components/works/WorkMasonry";
import { DataUnavailable } from "@/components/layout/DataUnavailable";
import { getChallengeById, getChallengeEntryCount, getPublicChallengeEntries } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

type ChallengeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChallengeDetailPage({ params }: ChallengeDetailPageProps) {
  const { id } = await params;
  const data = await (async () => {
    const challenge = await getChallengeById(id);
    if (!challenge) return null;
    const [entryCount, entries] = await Promise.all([getChallengeEntryCount(challenge.id), getPublicChallengeEntries(challenge.id)]);
    return { challenge, entryCount, entries };
  })().catch((error) => {
    console.error("Failed to load challenge detail", error);
    return undefined;
  });

  if (data === undefined) {
    return <DataUnavailable title="挑战详情暂时没有读到" />;
  }

  if (!data) {
    notFound();
  }

  const works = data.entries.map((entry) => entry.work);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <Link href="/challenges" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft size={16} />
        返回挑战页
      </Link>

      <div className="space-y-12">
        <ChallengeHero challenge={data.challenge} entryCount={data.entryCount} />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <h2 className="text-lg font-semibold text-ink">规则</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">{data.challenge.requirements}</p>
          </div>
          <div className="rounded-[6px] bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
            <h2 className="text-lg font-semibold text-ink">奖励</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">{data.challenge.rewards}</p>
          </div>
        </section>

        <RankingList title="参赛排行榜" works={works} metric="popular" />

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Works</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">全部参赛作品</h2>
          </div>
          <WorkMasonry works={works} />
        </section>
      </div>
    </div>
  );
}
