import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { PrivateProjectActionPanel, type AdminPrivateProjectAction } from "@/components/admin/PrivateProjectActionPanel";
import { requireAdminUser } from "@/lib/auth/guards";
import {
  PRIVATE_PROJECT_EVENT_LABELS,
  getAdminPrivateProjectDetail,
  getCurrentPrivateProjectAction,
  privateProjectActionSummary,
  type PrivateProjectAction
} from "@/lib/private-project-actions";
import { categoryLabel, needLabel } from "@/lib/start-projects";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
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

function serializeAction(action: PrivateProjectAction): AdminPrivateProjectAction {
  return {
    id: action.id,
    type: action.type,
    responsibility: action.responsibility,
    status: action.status,
    title: action.title,
    instructions: action.instructions,
    dueAt: action.dueAt?.toISOString() ?? null,
    updatedAt: action.updatedAt.toISOString(),
    userResultNote: action.userResultNote,
    userResultSubmittedAt: action.userResultSubmittedAt?.toISOString() ?? null
  };
}

function detail(label: string, value?: string | null) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink">{value?.trim() || "未填写"}</p>
    </div>
  );
}

function safeAdminReturnTo(value?: string | null) {
  if (!value || !value.startsWith("/admin/projects")) return "/admin/projects";
  if (value.startsWith("//") || value.includes("://")) return "/admin/projects";
  return value;
}

export default async function AdminPrivateProjectDetailPage({ params, searchParams }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) notFound();

  const { id } = await params;
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query?.returnTo);
  const project = await getAdminPrivateProjectDetail(id, admin);
  if (!project) notFound();

  const currentAction = getCurrentPrivateProjectAction(project.actions);
  const summary = privateProjectActionSummary(currentAction);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-12">
      <Link href={returnTo} className="inline-flex items-center gap-2 text-sm font-semibold text-ink/52 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">私有正式项目</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{summary.stageLabel}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{summary.statusLabel}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-5xl">{project.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">当前唯一下一步：{summary.title}</p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <PrivateProjectActionPanel
            projectId={project.id}
            projectUpdatedAt={project.updatedAt.toISOString()}
            currentAction={currentAction ? serializeAction(currentAction) : null}
          />

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">项目资料</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {detail("项目标题", project.title)}
              {detail("负责人", project.ownerUser?.nickname ?? project.ownerUserId)}
              {detail("启动品类", project.projectIntake ? categoryLabel(project.projectIntake.category, project.projectIntake.categoryOther) : null)}
              {detail("当前需求", project.projectIntake ? needLabel(project.projectIntake.primaryNeed) : null)}
              {detail("一句话想法", project.projectIntake?.ideaText ?? project.description)}
              {detail("平台评估反馈", project.projectIntake?.reviewNote)}
              {detail("建立时间", formatDate(project.projectIntake?.convertedAt ?? project.createdAt))}
              {detail("更新时间", formatDate(project.updatedAt))}
            </div>
            {project.projectIntake ? (
              <Link href={`/admin/project-intakes/${project.projectIntake.id}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                查看原始启动记录
              </Link>
            ) : null}
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">事件时间线</h2>
            <div className="mt-4 space-y-3">
              {project.events.length ? project.events.map((event) => (
                <article key={event.id} className="rounded-[8px] bg-paper p-4">
                  <p className="font-semibold text-ink">{PRIVATE_PROJECT_EVENT_LABELS[event.eventType]}</p>
                  {event.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{event.note}</p> : null}
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink/40">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(event.createdAt)}
                  </p>
                </article>
              )) : (
                <div className="rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/55">暂无项目动作事件。</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
