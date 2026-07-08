import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, displayDateRange, teacherAvatarUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import type { WorkCardData } from "@/lib/works/queries";
import { ChallengeStatus, ExhibitionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type TeacherDetailPageProps = {
  params: Promise<{ id: string }>;
};

function Empty({ text }: { text: string }) {
  return <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">{text}</div>;
}

export default async function TeacherDetailPage({ params }: TeacherDetailPageProps) {
  const { id } = await params;
  const teacher = await prisma.teacher.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      status: "ACTIVE"
    },
    include: {
      school: true,
      recommendations: {
        include: {
          work: {
            include: activityWorkInclude
          }
        },
        orderBy: { createdAt: "desc" }
      },
      exhibitions: {
        where: { status: ExhibitionStatus.PUBLISHED },
        include: {
          school: true,
          _count: { select: { works: true } }
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      challenges: {
        where: { status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] } },
        include: {
          school: true,
          _count: { select: { works: true, entries: true } }
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!teacher) {
    notFound();
  }

  const visibleRecommendations = teacher.recommendations.filter((item) => item.work.reviewStatus === "APPROVED" && item.work.contentStatus === "VISIBLE");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <img src={teacherAvatarUrl(teacher.avatarUrl)} alt={teacher.name} className="size-24 rounded-full object-cover" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Teacher</p>
            <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{teacher.name}</h1>
            <p className="mt-3 text-sm text-ink/52">
              {teacher.school ? <Link href={`/schools/${teacher.school.slug ?? teacher.school.id}`} className="font-semibold underline">{teacher.school.name}</Link> : "学校待关联"}
              {teacher.title ? ` / ${teacher.title}` : ""}
              {teacher.department ? ` / ${teacher.department}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-ink/60">{teacher.bio ?? "老师简介待补充"}</p>
      </header>

      <div className="mt-10 space-y-12">
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">老师推荐作品</h2>
          {visibleRecommendations.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {visibleRecommendations.map((recommendation, index) => (
                <div key={recommendation.id} className="space-y-3">
                  <WorkCard work={recommendation.work as unknown as WorkCardData} index={index} compact />
                  {recommendation.note ? <p className="rounded-[8px] border border-black/8 bg-white p-3 text-xs leading-5 text-ink/58">推荐理由：{recommendation.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <Empty text="暂无老师推荐作品。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">参与作品展</h2>
          {teacher.exhibitions.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {teacher.exhibitions.map((exhibition) => (
                <Link key={exhibition.id} href={`/exhibitions/${exhibition.slug ?? exhibition.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{exhibition.title}</h3>
                  <p className="mt-2 text-sm text-ink/52">
                    {exhibition.school?.name ?? "学校待关联"} / {displayDateRange(exhibition.startDate, exhibition.endDate)} / {exhibition._count.works} 件作品
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="暂无参与作品展。" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">参与挑战赛</h2>
          {teacher.challenges.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {teacher.challenges.map((challenge) => (
                <Link key={challenge.id} href={`/challenges/${challenge.slug ?? challenge.id}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <h3 className="font-semibold text-ink">{challenge.title}</h3>
                  <p className="mt-2 text-sm text-ink/52">
                    {challenge.theme} / {challenge._count.works + challenge._count.entries} 件作品
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty text="暂无参与挑战赛。" />
          )}
        </section>
      </div>
    </div>
  );
}
