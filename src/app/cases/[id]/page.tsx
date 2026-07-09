import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStudyStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CasePageProps = { params: Promise<{ id: string }> };

function StoryBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-ink/62">{children}</div>
    </section>
  );
}

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
      <div className="mt-8 grid gap-5">
        <StoryBlock title="背景">
          <p>{item.summary ?? "该案例记录作品从公开展示进入孵化验证的过程。"}</p>
        </StoryBlock>

        <StoryBlock title="作品亮点">
          <p>{item.work?.title ?? item.project?.title ?? "作品信息正在补充"} 围绕设计表达、材料选择和市场反馈展开验证。</p>
        </StoryBlock>

        <StoryBlock title="孵化过程">
          <p className="whitespace-pre-line">{item.content ?? "平台围绕作品展示、老师推荐、资源匹配和预售验证逐步推进，帮助设计师确认下一步合作方向。"}</p>
        </StoryBlock>

        <StoryBlock title="参与资源">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
            {item.work ? <Link href={`/works/${item.workId}`} className="rounded-full bg-paper px-3 py-1">作品：{item.work.title}</Link> : null}
            {item.project ? <Link href={`/projects/${item.project.slug ?? item.projectId}`} className="rounded-full bg-paper px-3 py-1">合作项目：{item.project.title}</Link> : null}
            {item.school ? <Link href={`/schools/${item.school.slug ?? item.schoolId}`} className="rounded-full bg-paper px-3 py-1">学校：{item.school.name}</Link> : null}
            {item.teacher ? <Link href={`/teachers/${item.teacher.slug ?? item.teacherId}`} className="rounded-full bg-paper px-3 py-1">老师：{item.teacher.name}</Link> : null}
            {item.provider ? <Link href={`/providers/${item.provider.slug ?? item.providerId}`} className="rounded-full bg-paper px-3 py-1">服务商：{item.provider.name}</Link> : null}
          </div>
        </StoryBlock>

        <StoryBlock title="结果">
          <p>{item.resultNote ?? "平台正在整理该案例的阶段性结果。"}</p>
        </StoryBlock>

        <StoryBlock title="下一步">
          <p>继续跟进作品孵化、预售验证和合作资源，确认更适合设计师的落地路径。</p>
        </StoryBlock>
      </div>
    </div>
  );
}
