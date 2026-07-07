import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, coverUrl, displayDateRange } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import type { WorkCardData } from "@/lib/works/queries";
import { ChallengeStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type ChallengeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChallengeDetailPage({ params }: ChallengeDetailPageProps) {
  const { id } = await params;
  const challenge = await prisma.challenge.findFirst({
    where: {
      AND: [
        { OR: [{ id }, { slug: id }] },
        { OR: [{ status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] } }, { isFeatured: true }] }
      ]
    },
    include: {
      school: true,
      teacher: true,
      works: {
        include: {
          work: {
            include: activityWorkInclude
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
      },
      entries: {
        include: {
          work: {
            include: activityWorkInclude
          }
        },
        orderBy: [{ manualRank: "asc" }, { popularityScore: "desc" }, { incubationScore: "desc" }]
      }
    }
  });

  if (!challenge) {
    notFound();
  }

  const directWorks = challenge.works.map((item) => item.work);
  const entryWorks = challenge.entries.map((item) => item.work);
  const works = [...directWorks, ...entryWorks].filter((work, index, array) => {
    return work.reviewStatus === "APPROVED" && work.contentStatus === "VISIBLE" && array.findIndex((item) => item.id === work.id) === index;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <img src={coverUrl(challenge.id, challenge.coverUrl)} alt={challenge.title} className="aspect-[16/7] w-full object-cover" />
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Challenge</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{challenge.title}</h1>
          <p className="mt-3 text-sm text-ink/52">
            {challenge.school ? <Link href={`/schools/${challenge.school.slug ?? challenge.school.id}`} className="font-semibold underline">{challenge.school.name}</Link> : "学校待关联"}
            {challenge.teacher ? <> / <Link href={`/teachers/${challenge.teacher.slug ?? challenge.teacher.id}`} className="font-semibold underline">{challenge.teacher.name}</Link></> : " / 老师待关联"}
          </p>
          <p className="mt-2 text-sm text-ink/52">{displayDateRange(challenge.startAt, challenge.endAt)}</p>
          <p className="mt-5 max-w-3xl text-lg font-semibold text-ink">{challenge.theme}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/60">{challenge.description}</p>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">主题说明</h2>
          <p className="mt-3 text-sm leading-6 text-ink/60">{challenge.requirements || "规则说明待补充"}</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">机会与奖励</h2>
          <p className="mt-3 text-sm leading-6 text-ink/60">{challenge.rewards || "奖励说明待补充"}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-ink">关联作品</h2>
        {works.length ? (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {works.map((work, index) => (
              <WorkCard key={work.id} work={work as unknown as WorkCardData} index={index} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无关联作品。</div>
        )}
      </section>
    </div>
  );
}
