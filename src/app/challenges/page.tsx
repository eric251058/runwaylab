import Link from "next/link";
import type { Metadata } from "next";
import { challengeCoverUrl, displayDateRange } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import { getPublicQualityWorkIds } from "@/lib/works/queries";
import { ChallengeStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "设计挑战赛",
  description: "查看 RunwayLab 设计挑战赛、主题任务、院校活动和参与作品。"
};

export default async function ChallengesPage() {
  const qualityWorkIds = await getPublicQualityWorkIds();
  const qualityWorkIdList = qualityWorkIds.length ? qualityWorkIds : ["__no_public_quality_work__"];
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [{ status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] } }, { isFeatured: true }]
    },
    include: {
      school: true,
      teacher: true,
      _count: {
        select: {
          works: {
            where: {
              workId: {
                in: qualityWorkIdList
              }
            }
          },
          entries: {
            where: {
              workId: {
                in: qualityWorkIdList
              }
            }
          }
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Challenges</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">设计挑战赛</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">展示院校、老师或平台发起的设计挑战。本批只做作品展示与关联，不做复杂报名系统。</p>
      </header>

      {challenges.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <Link key={challenge.id} href={`/challenges/${challenge.slug ?? challenge.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
              <img src={challengeCoverUrl(challenge.coverUrl)} alt={challenge.title} className="aspect-[16/9] w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap gap-2">
                  {challenge.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐</span> : null}
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{challenge.status}</span>
                </div>
                <h2 className="line-clamp-2 text-xl font-semibold text-ink">{challenge.title}</h2>
                <p className="line-clamp-1 text-sm text-ink/52">{challenge.theme}</p>
                <p className="text-sm text-ink/52">{challenge.school?.name ?? "学校待关联"} / {challenge.teacher?.name ?? "老师待关联"}</p>
                <p className="text-sm text-ink/52">{displayDateRange(challenge.startAt, challenge.endAt)} / {challenge._count.works + challenge._count.entries} 件作品</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无已发布挑战赛，后台发布后会显示在这里。</div>
      )}
    </div>
  );
}
