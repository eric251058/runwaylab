import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, displayDateRange, schoolCoverUrl } from "@/lib/school-activity";
import { INCUBATION_BATCH_STATUS_LABELS, INCUBATION_BATCH_TYPE_LABELS, publicBatchWhere, publicQualityBatchWorkWhere } from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";
import { getPublicQualityWorkIds, type WorkCardData } from "@/lib/works/queries";
import { isPublicQualityWork } from "@/lib/works/rules";
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
  const qualityWorkIds = await getPublicQualityWorkIds();
  const qualityWorkIdList = qualityWorkIds.length ? qualityWorkIds : ["__no_public_quality_work__"];
  const batchWorkWhere = await publicQualityBatchWorkWhere();
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
        where: {
          id: {
            in: qualityWorkIdList
          }
        },
        include: activityWorkInclude,
        take: 8,
        orderBy: { createdAt: "desc" }
      },
      exhibitions: {
        where: {
          status: ExhibitionStatus.PUBLISHED
        },
        include: { _count: { select: { works: { where: { workId: { in: qualityWorkIdList } } } } } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      challenges: {
        where: {
          status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] }
        },
        include: { _count: { select: { works: { where: { workId: { in: qualityWorkIdList } } }, entries: { where: { workId: { in: qualityWorkIdList } } } } } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      incubationBatches: {
        where: publicBatchWhere(),
        include: { _count: { select: { works: { where: batchWorkWhere }, providers: true } } },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: 6
      }
    }
  });

  if (!school) {
    notFound();
  }

  const schoolWorks = school.works.filter(isPublicQualityWork);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <img src={schoolCoverUrl(school.coverUrl ?? school.logoUrl)} alt={school.name} className="aspect-[16/7] w-full object-cover" />
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">School</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{school.name}</h1>
          <p className="mt-3 text-sm text-ink/52">{school.city ?? "合作院校"}</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">{school.description ?? "该院校正在参与 RunwayLab 作品展示与孵化试运营。"}</p>
          {school.website ? (
            <a href={school.website} className="mt-5 inline-flex text-sm font-semibold text-ink underline">
              学校官网
            </a>
          ) : null}
        </div>
      </header>

      <div className="mt-10 space-y-12">
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">代表老师</h2>
          {school.teachers.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {school.teachers.map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.slug ?? teacher.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{teacher.name}</h3>
                  <p className="mt-1 text-sm text-ink/52">{teacher.title ?? teacher.department ?? "参与作品指导与推荐"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="平台正在补充该院校的老师信息。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">学校作品</h2>
          {schoolWorks.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {schoolWorks.map((work, index) => (
                <WorkCard key={work.id} work={work as unknown as WorkCardData} index={index} compact />
              ))}
            </div>
          ) : (
            <Empty text="平台正在补充该院校的作品信息。" />
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
            <Empty text="平台正在补充该院校的课程作品展信息。" />
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
            <Empty text="平台正在补充该院校的挑战赛信息。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">相关孵化批次</h2>
          {school.incubationBatches.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {school.incubationBatches.map((batch) => (
                <Link key={batch.id} href={`/batches/${batch.slug}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{batch.title}</h3>
                  <p className="mt-2 text-sm text-ink/52">作品 {batch._count.works} / 服务商 {batch._count.providers}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="该学校暂未关联公开孵化批次。" />
          )}
        </section>
      </div>
    </div>
  );
}
