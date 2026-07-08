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
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">成功案例</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">展示作品从展示、孵化、预售验证到产业协作的案例记录。</p>
      </header>
      {cases.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <Link key={item.id} href={`/cases/${item.slug}`} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
              <h2 className="line-clamp-2 text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/56">{item.summary ?? "案例摘要待补充"}</p>
              <p className="mt-3 text-xs text-ink/42">{[item.school?.name, item.teacher?.name, item.provider?.name].filter(Boolean).join(" / ") || item.designerName || "关联方待补充"}</p>
            </Link>
          ))}
        </div>
      ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无已发布案例。</div>}
    </div>
  );
}
