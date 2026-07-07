import Link from "next/link";
import { coverUrl } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const schools = await prisma.school.findMany({
    where: {
      status: "ACTIVE"
    },
    include: {
      _count: {
        select: {
          teachers: true,
          works: true
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Schools</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服装设计院校</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">展示院校、老师、课程作品展和毕业设计专题，让学生作品更容易被看见。</p>
      </header>

      {schools.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Link key={school.id} href={`/schools/${school.slug ?? school.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
              <img src={coverUrl(school.id, school.coverUrl ?? school.logoUrl)} alt={school.name} className="aspect-[16/9] w-full object-cover" />
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="line-clamp-1 text-xl font-semibold text-ink">{school.name}</h2>
                  {school.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐</span> : null}
                </div>
                <p className="text-sm text-ink/52">{school.city ?? "城市待补充"}</p>
                <p className="line-clamp-2 text-sm leading-6 text-ink/58">{school.description ?? "学校简介待补充"}</p>
                <div className="flex gap-2 text-xs font-semibold text-ink/45">
                  <span>老师 {school._count.teachers}</span>
                  <span>作品 {school._count.works}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无学校数据，后台创建学校后会显示在这里。</div>
      )}
    </div>
  );
}
