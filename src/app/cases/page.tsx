import Link from "next/link";
import type { Metadata } from "next";
import { CaseStudyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "孵化案例",
  description: "查看 RunwayLab 设计作品从展示、推荐、供应链匹配到孵化验证的案例。"
};

export default async function CasesPage() {
  const cases = await prisma.caseStudy.findMany({
    where: { status: CaseStudyStatus.PUBLISHED },
    include: { work: true, project: true, school: true, teacher: true, provider: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 60
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-6 rounded-[8px] bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:mb-8 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Cases</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">RunwayLab 孵化案例</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4">记录设计作品从展示、推荐、资源匹配到孵化验证的真实故事。</p>
      </header>
      {cases.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <Link key={item.id} href={`/cases/${item.slug}`} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
              <h2 className="line-clamp-2 text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm text-ink/52">作品：{item.work?.title ?? item.project?.title ?? "待补充"}</p>
              <p className="mt-2 text-sm text-ink/52">学校 / 老师：{[item.school?.name, item.teacher?.name].filter(Boolean).join(" / ") || "待补充"}</p>
              <p className="mt-2 text-sm text-ink/52">服务商：{item.provider?.name ?? "待补充"}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/56">结果：{item.resultNote ?? item.summary ?? "待补充"}</p>
              <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                查看案例
              </span>
            </Link>
          ))}
        </div>
      ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在积累首批孵化案例。</div>}
    </div>
  );
}
