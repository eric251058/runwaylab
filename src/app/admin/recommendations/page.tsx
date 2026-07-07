import Link from "next/link";
import { saveRecommendation } from "@/lib/school-activity-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminRecommendationsPage() {
  const [recommendations, teachers] = await Promise.all([
    prisma.teacherRecommendedWork.findMany({
      include: {
        teacher: { include: { school: true } },
        work: { include: { user: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.teacher.findMany({ where: { status: "ACTIVE" }, include: { school: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">老师推荐作品</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">选择老师和作品后，会生成老师推荐记录，并同步作品的指导老师与学校关联。</p>
      </header>

      <form action={saveRecommendation} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="teacherId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择老师</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.school ? ` / ${teacher.school.name}` : ""}</option>
          ))}
        </select>
        <input name="workId" required placeholder="作品 ID" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="tag" placeholder="推荐标签，如 课程推荐" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <textarea name="note" placeholder="推荐理由" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增推荐</button>
      </form>

      <section className="mt-8 space-y-3">
        {recommendations.length ? recommendations.map((item) => (
          <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{item.work.title}</h2>
                <p className="mt-1 text-sm text-ink/52">
                  {item.teacher?.name ?? "老师已删除"}{item.teacher?.school ? ` / ${item.teacher.school.name}` : ""} / 作者 {item.work.user.nickname}
                </p>
              </div>
              <Link href={`/works/${item.workId}`} className="w-fit rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">查看作品</Link>
            </div>
            {item.note ? <p className="mt-3 text-sm leading-6 text-ink/58">推荐理由：{item.note}</p> : null}
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无老师推荐。</div>}
      </section>
    </div>
  );
}
