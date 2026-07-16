import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionGuide } from "@/components/ActionGuide";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, displayDateRange, teacherAvatarUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import { isPublicQualityWork } from "@/lib/works/rules";
import { getPublicQualityWorkIds, type WorkCardData } from "@/lib/works/queries";
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
  const qualityWorkIds = await getPublicQualityWorkIds();
  const qualityWorkIdList = qualityWorkIds.length ? qualityWorkIds : ["__no_public_quality_work__"];
  const teacher = await prisma.teacher.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      status: "ACTIVE"
    },
    include: {
      school: true,
      recommendations: {
        where: {
          workId: {
            in: qualityWorkIdList
          }
        },
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
          _count: { select: { works: { where: { workId: { in: qualityWorkIdList } } } } }
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      },
      challenges: {
        where: { status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] } },
        include: {
          school: true,
          _count: { select: { works: { where: { workId: { in: qualityWorkIdList } } }, entries: { where: { workId: { in: qualityWorkIdList } } } } }
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!teacher) {
    notFound();
  }

  const visibleRecommendations = teacher.recommendations.filter((item) => isPublicQualityWork(item.work));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <img src={teacherAvatarUrl(teacher.avatarUrl)} alt={teacher.name} className="size-24 rounded-full object-cover" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Teacher</p>
            <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{teacher.name}</h1>
            <p className="mt-3 text-sm text-ink/52">
              {teacher.school ? <Link href={`/schools/${teacher.school.slug ?? teacher.school.id}`} className="font-semibold underline">{teacher.school.name}</Link> : "院校合作资源"}
              {teacher.title ? ` / ${teacher.title}` : ""}
              {teacher.department ? ` / ${teacher.department}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-ink/60">{teacher.bio ?? "该老师参与学生作品推荐与课程作品展示，为优秀设计作品提供进一步展示和孵化背书。"}</p>
      </header>

      <div className="mt-10 space-y-12">
        <ActionGuide
          eyebrow="Teacher Recommendation"
          title="老师推荐，是学生作品进入孵化验证的第一轮信任背书。"
          description="推荐理由会展示在作品详情页，帮助学校、服务商、买手和普通用户更快理解作品价值。当前推荐动作由平台运营协助完成。"
          actions={[
            { label: "查看挑战赛", href: "/challenges", primary: true },
            { label: "查看课程作品展", href: "/exhibitions" }
          ]}
        />

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-ink">老师推荐代表作品</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">这些作品由老师或平台运营标记推荐，推荐理由会帮助作品获得更多展示和孵化机会。</p>
          </div>
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
            <Empty text="平台正在补充老师推荐代表作品。" />
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
            <Empty text="平台正在补充该老师参与的作品展信息。" />
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
            <Empty text="平台正在补充该老师参与的挑战赛信息。" />
          )}
        </section>
      </div>
    </div>
  );
}
