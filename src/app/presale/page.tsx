import Link from "next/link";
import { CrowdSubmissionForm } from "@/components/incubation/CrowdSubmissionForm";
import { visualFor } from "@/components/works/work-visuals";
import { incubationStatusLabels } from "@/lib/incubation";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { WorkIncubationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type PresalePageProps = {
  searchParams?: Promise<{
    workId?: string;
  }>;
};

async function getPresaleWorks() {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      user: {
        include: {
          designerProfile: true
        }
      },
      workIncubation: true,
      _count: {
        select: {
          presaleIntents: true
        }
      }
    },
    orderBy: [{ likeCount: "desc" }, { favoriteCount: "desc" }, { createdAt: "desc" }],
    take: 24
  });
}

export default async function PresalePage({ searchParams }: PresalePageProps) {
  const params = await searchParams;
  const works = await getPresaleWorks();
  const selectedWork = params?.workId ? works.find((work) => work.id === params.workId) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Presale Intent</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预售意向池</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60 md:text-base">
          当前仅收集预售意向，不收款、不生成订单、不涉及退款或物流。设计师会在我的页面查看反馈。
        </p>
      </header>

      {selectedWork ? (
        <div className="mb-8">
          <CrowdSubmissionForm kind="presale" workId={selectedWork.id} workTitle={selectedWork.title} />
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((work, index) => {
          const status = work.workIncubation?.status ?? WorkIncubationStatus.DISPLAYING;
          return (
            <article key={work.id} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
              <img src={visualFor(index, work.images[0])} alt={work.title} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-4 p-4">
                <div>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{incubationStatusLabels[status]}</span>
                  <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-ink">{work.title}</h2>
                  <p className="mt-2 text-sm text-ink/52">{work.user.nickname}</p>
                </div>
                <p className="text-sm text-ink/55">已有 {work._count.presaleIntents} 条预售意向</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/presale?workId=${work.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                    我想预定
                  </Link>
                  <Link href={`/works/${work.id}`} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                    查看作品
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
