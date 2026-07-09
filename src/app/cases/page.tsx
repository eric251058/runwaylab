import Link from "next/link";
import { CaseStudyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await prisma.caseStudy.findMany({
    where: { status: CaseStudyStatus.PUBLISHED },
    include: { work: true, project: true, school: true, teacher: true, provider: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 60
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Cases</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">RunwayLab 孵化案例</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">记录作品从发布到孵化验证的过程。</p>
      </header>
      {cases.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <Link key={item.id} href={`/cases/${item.slug}`} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
              <h2 className="line-clamp-2 text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm text-ink/52">作品：{item.work?.title ?? item.project?.title ?? "待补充"}</p>
              <p className="mt-2 text-sm text-ink/52">学校 / 老师：{[item.school?.name, item.teacher?.name].filter(Boolean).join(" / ") || "待补充"}</p>
              <p className="mt-2 text-sm text-ink/52">服务商：{item.provider?.name ?? "待补充"}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/56">结果：{item.resultNote ?? item.summary ?? "待补充"}</p>
            </Link>
          ))}
        </div>
      ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无已发布案例。</div>}
    </div>
  );
}
