import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, displayDateRange, schoolCoverUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import type { WorkCardData } from "@/lib/works/queries";
import { ChallengeStatus, ExhibitionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SchoolDetailPageProps = {
  params: Promise<{ id: string }>;
};

function Empty({ text }: { text: string }) {
  return <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">{text}</div>;
}

export default async function SchoolDetailPage({ params }: SchoolDetailPageProps) {
  const { id } = await params;
  const school = await prisma.school.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      status: "ACTIVE"
    },
    include: {
      teachers: {
        where: {
          status: "ACTIVE"
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      works: {
        where: approvedVisibleWorkWhere,
        include: activityWorkInclude,
        take: 8,
        orderBy: { createdAt: "desc" }
      },
      exhibitions: {
        where: {
          status: ExhibitionStatus.PUBLISHED
        },
        include: { _count: { select: { works: true } } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      challenges: {
        where: {
          status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] }
        },
        include: { _count: { select: { works: true, entries: true } } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!school) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <img src={schoolCoverUrl(school.coverUrl ?? school.logoUrl)} alt={school.name} className="aspect-[16/7] w-full object-cover" />
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">School</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{school.name}</h1>
          <p className="mt-3 text-sm text-ink/52">{school.city ?? "城市待补充"}</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">{school.description ?? "学校简介待补充"}</p>
          {school.website ? (
            <a href={school.website} className="mt-5 inline-flex text-sm font-semibold text-ink underline">
              学校官网
            </a>
          ) : null}
        </div>
      </header>

      <div className="mt-10 space-y-12">
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">老师列表</h2>
          {school.teachers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {school.teachers.map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.slug ?? teacher.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{teacher.name}</h3>
                  <p className="mt-1 text-sm text-ink/52">{teacher.title ?? teacher.department ?? "老师资料待补充"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="暂无老师数据。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">学校作品</h2>
          {school.works.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {school.works.map((work, index) => (
                <WorkCard key={work.id} work={work as unknown as WorkCardData} index={index} compact />
              ))}
            </div>
          ) : (
            <Empty text="暂无关联作品。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">课程作品展</h2>
          {school.exhibitions.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {school.exhibitions.map((exhibition) => (
                <Link key={exhibition.id} href={`/exhibitions/${exhibition.slug ?? exhibition.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{exhibition.title}</h3>
                  <p className="mt-2 text-sm text-ink/52">
                    {displayDateRange(exhibition.startDate, exhibition.endDate)} / {exhibition._count.works} 件作品
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="暂无课程作品展。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">设计挑战赛</h2>
          {school.challenges.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {school.challenges.map((challenge) => (
                <Link key={challenge.id} href={`/challenges/${challenge.slug ?? challenge.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{challenge.title}</h3>
                  <p className="mt-2 text-sm text-ink/52">
                    {challenge.theme} / {challenge._count.works + challenge._count.entries} 件作品
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="暂无挑战赛。" />
          )}
        </section>
      </div>
    </div>
  );
}
