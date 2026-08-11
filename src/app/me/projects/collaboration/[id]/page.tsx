import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clock, ListChecks } from "lucide-react";
import { PrivateProjectActionCard, type PrivateProjectActionCardAction } from "@/components/projects/PrivateProjectActionCard";
import { getCurrentUser } from "@/lib/auth/session";
import {
  privateProjectCurrentAction,
  getPrivateCollaborationProjectForViewer,
  privateProjectIntakeSummary,
  privateProjectNextAction,
  privateProjectStageLabel,
  privateProjectTimeline
} from "@/lib/private-collaboration-projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "项目工作台",
  robots: {
    index: false,
    follow: false
  }
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value?: Date | null) {
  if (!value) return "未记录";
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function info(label: string, value?: string | null) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink">{value?.trim() || "未填写"}</p>
    </div>
  );
}

function serializeAction(action: NonNullable<ReturnType<typeof privateProjectCurrentAction>>): PrivateProjectActionCardAction {
  return {
    id: action.id,
    title: action.title,
    instructions: action.instructions,
    status: action.status,
    responsibility: action.responsibility,
    dueAt: action.dueAt?.toISOString() ?? null,
    updatedAt: action.updatedAt.toISOString(),
    userResultNote: action.userResultNote,
    userResultSubmittedAt: action.userResultSubmittedAt?.toISOString() ?? null
  };
}

export default async function PrivateCollaborationProjectPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) redirect(`/login?next=/me/projects/collaboration/${id}`);

  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) notFound();

  const currentAction = privateProjectCurrentAction(project);
  const nextAction = privateProjectNextAction(project);
  const timeline = privateProjectTimeline(project);
  const intake = project.projectIntake;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">
        返回项目工作台
      </Link>

      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{privateProjectStageLabel(project)}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">私有项目</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">平台评估已通过</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-5xl">{project.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58">{nextAction.description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" disabled className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white opacity-80">
            {nextAction.label}
          </button>
          {intake ? (
            <Link href={`/me/start-projects/${intake.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">
              查看原始启动记录
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <PrivateProjectActionCard projectId={project.id} action={currentAction ? serializeAction(currentAction) : null} />

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">项目摘要</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {info("当前阶段", privateProjectStageLabel(project))}
              {info("下一步", nextAction.label)}
              {info("当前动作", currentAction?.title)}
              {info("原始启动信息", privateProjectIntakeSummary(project))}
              {info("一句话想法", project.description)}
              {info("平台反馈", intake?.reviewNote)}
              {info("建立时间", formatDate(intake?.convertedAt ?? project.createdAt))}
            </div>
          </section>

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">项目时间线</h2>
            <div className="mt-4 space-y-3">
              {timeline.map((event) => (
                <article key={event.id} className="rounded-[8px] bg-paper p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-ink">{event.title}</p>
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-ink/40">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(event.at)}
                    </p>
                  </div>
                  {event.description ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{event.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">下一步</h2>
            <p className="mt-3 text-sm leading-6 text-ink/58">{nextAction.description}</p>
            <div className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
              当前不会自动匹配供应商、面料、打样或工厂，也不会自动进入预售。
            </div>
          </section>

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">入口</h2>
            <div className="mt-4 grid gap-2">
              <Link href="/me/projects" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                <ListChecks className="h-4 w-4" />
                我的项目
              </Link>
              {intake ? (
                <Link href={`/me/start-projects/${intake.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                  原始记录 <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
