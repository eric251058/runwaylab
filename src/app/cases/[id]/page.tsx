import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStudyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CasePageProps = { params: Promise<{ id: string }> };

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { id } = await params;
  const item = await prisma.caseStudy.findFirst({
    where: { OR: [{ id }, { slug: id }], status: CaseStudyStatus.PUBLISHED },
    include: { work: true, project: true, school: true, teacher: true, provider: true }
  });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Case Study</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{item.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">{item.summary ?? "案例摘要待补充"}</p>
      </header>
      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">合作过程</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/62">{item.content ?? "案例过程待补充"}</p>
        {item.resultNote ? <p className="mt-5 rounded-[6px] bg-paper p-4 text-sm leading-6 text-ink/58">结果说明：{item.resultNote}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
          {item.work ? <Link href={`/works/${item.workId}`} className="rounded-full bg-paper px-3 py-1">作品：{item.work.title}</Link> : null}
          {item.project ? <Link href={`/projects/${item.project.slug ?? item.projectId}`} className="rounded-full bg-paper px-3 py-1">项目：{item.project.title}</Link> : null}
          {item.provider ? <Link href={`/providers/${item.provider.slug ?? item.providerId}`} className="rounded-full bg-paper px-3 py-1">服务商：{item.provider.name}</Link> : null}
        </div>
      </section>
    </div>
  );
}
