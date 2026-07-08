import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkCard } from "@/components/works/WorkCard";
import { activityWorkInclude, displayDateRange, exhibitionCoverUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";
import type { WorkCardData } from "@/lib/works/queries";
import { ExhibitionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type ExhibitionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitionDetailPage({ params }: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await prisma.exhibition.findFirst({
    where: {
      AND: [
        { OR: [{ id }, { slug: id }] },
        { OR: [{ status: ExhibitionStatus.PUBLISHED }, { isFeatured: true }] }
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
      }
    }
  });

  if (!exhibition) {
    notFound();
  }

  const works = exhibition.works.filter((item) => item.work.reviewStatus === "APPROVED" && item.work.contentStatus === "VISIBLE");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <img src={exhibitionCoverUrl(exhibition.coverUrl)} alt={exhibition.title} className="aspect-[16/7] w-full object-cover" />
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Exhibition</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{exhibition.title}</h1>
          <p className="mt-3 text-sm text-ink/52">
            {exhibition.school ? <Link href={`/schools/${exhibition.school.slug ?? exhibition.school.id}`} className="font-semibold underline">{exhibition.school.name}</Link> : "学校待关联"}
            {exhibition.teacher ? <> / <Link href={`/teachers/${exhibition.teacher.slug ?? exhibition.teacher.id}`} className="font-semibold underline">{exhibition.teacher.name}</Link></> : " / 老师待关联"}
          </p>
          <p className="mt-2 text-sm text-ink/52">{displayDateRange(exhibition.startDate, exhibition.endDate)}</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">{exhibition.description ?? "展览简介待补充"}</p>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-ink">关联作品</h2>
        {works.length ? (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {works.map((item, index) => (
              <WorkCard key={item.id} work={item.work as unknown as WorkCardData} index={index} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无关联作品。</div>
        )}
      </section>
    </div>
  );
}
