import Link from "next/link";
import { coverUrl, displayDateRange } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import { ExhibitionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ExhibitionsPage() {
  const exhibitions = await prisma.exhibition.findMany({
    where: {
      OR: [{ status: ExhibitionStatus.PUBLISHED }, { isFeatured: true }]
    },
    include: {
      school: true,
      teacher: true,
      _count: {
        select: {
          works: true
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Exhibitions</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">课程作品展</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">承接课程作业、毕业设计展、院校专题展，让作品以班级和课程为单位被展示。</p>
      </header>

      {exhibitions.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((exhibition) => (
            <Link key={exhibition.id} href={`/exhibitions/${exhibition.slug ?? exhibition.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
              <img src={coverUrl(exhibition.id, exhibition.coverUrl)} alt={exhibition.title} className="aspect-[16/9] w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap gap-2">
                  {exhibition.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐</span> : null}
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{exhibition.type}</span>
                </div>
                <h2 className="line-clamp-2 text-xl font-semibold text-ink">{exhibition.title}</h2>
                <p className="text-sm text-ink/52">{exhibition.school?.name ?? "学校待关联"} / {exhibition.teacher?.name ?? "老师待关联"}</p>
                <p className="text-sm text-ink/52">{displayDateRange(exhibition.startDate, exhibition.endDate)} / {exhibition._count.works} 件作品</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无已发布作品展，后台发布后会显示在这里。</div>
      )}
    </div>
  );
}
