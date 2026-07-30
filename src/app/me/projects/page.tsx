import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Clock, ListChecks } from "lucide-react";
import { SafeImage } from "@/components/media/SafeImage";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { getDesignerProjectWorkbench } from "@/lib/project-workbench";
import {
  PROJECT_INTAKE_STATUS_LABELS,
  categoryLabel,
  getProjectIntakesForUser,
  needLabel,
  projectIntakeNextAction,
  projectIntakeTitle,
  sourceLabel
} from "@/lib/start-projects";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

export default async function MeProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/projects");

  const [projects, intakes] = await Promise.all([
    getDesignerProjectWorkbench(user.id),
    getProjectIntakesForUser(user.id)
  ]);
  const pendingTotal = projects.reduce((sum, project) => sum + project.pendingCount, 0);
  const unreadTotal = projects.reduce((sum, project) => sum + project.unreadNotificationCount, 0);
  const totalProjectCount = projects.length + intakes.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Project Workbench</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">项目进度工作台</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
            启动草稿用于推进一个服装产品想法；发布作品用于公开展示设计作品。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/start" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            新建项目
          </Link>
          <Link href="/me/incubation" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
            原孵化页
          </Link>
          <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
            发布作品
          </Link>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("项目数", totalProjectCount)}
        {stat("启动草稿", intakes.length)}
        {stat("待处理", pendingTotal)}
        {stat("未读通知", unreadTotal)}
      </section>

      {totalProjectCount ? (
        <section className="grid gap-4">
          {intakes.map((intake) => {
            const nextAction = projectIntakeNextAction(intake);
            return (
              <article key={intake.id} className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_14px_42px_rgba(16,16,16,0.07)] md:grid-cols-[160px_1fr_auto] md:items-center">
                <Link href={`/me/start-projects/${intake.id}`} className="flex aspect-[4/3] items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/40">
                  启动草稿
                </Link>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_INTAKE_STATUS_LABELS[intake.status]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">完成度 {intake.completion}%</span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-xl font-semibold text-ink">
                    <Link href={`/me/start-projects/${intake.id}`} className="hover:text-ink/70">
                      {projectIntakeTitle(intake)}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">
                    {intake.ideaText || "先从一个产品想法开始，后续再补充图片、定位和计划。"}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-ink/45 sm:grid-cols-3">
                    <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{sourceLabel(intake.sourceType)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(intake.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5" />{categoryLabel(intake.category, intake.categoryOther)} / {needLabel(intake.primaryNeed)}</span>
                  </div>
                </div>

                <div className="grid gap-2 md:w-48">
                  <Link href={`/me/start-projects/${intake.id}#positioning`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                    {nextAction.label}
                  </Link>
                  <Link href={`/me/start-projects/${intake.id}`} className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                    查看草稿 <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
          {projects.map((project, index) => (
            <article key={project.id} className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_14px_42px_rgba(16,16,16,0.07)] md:grid-cols-[160px_1fr_auto] md:items-center">
              <Link href={`/me/projects/${project.workId}`} className="block overflow-hidden rounded-[6px] bg-paper">
                <SafeImage src={visualFor(index, project.imageUrl)} alt={project.title} className="aspect-[4/3] w-full object-cover" placeholder="作品封面" />
              </Link>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{project.stageLabel}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">等待：{project.waitingFor}</span>
                  {project.unreadNotificationCount ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">未读 {project.unreadNotificationCount}</span> : null}
                </div>
                <h2 className="mt-3 line-clamp-2 text-xl font-semibold text-ink">
                  <Link href={`/me/projects/${project.workId}`} className="hover:text-ink/70">
                    {project.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{project.statusDescription}</p>
                <div className="mt-3 grid gap-2 text-xs font-semibold text-ink/45 sm:grid-cols-3">
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />待处理 {project.pendingCount}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(project.lastUpdatedAt)}</span>
                  <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5" />通知 {project.notificationCount}</span>
                </div>
              </div>

              <div className="grid gap-2 md:w-48">
                <Link href={project.nextAction.href} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                  {project.nextAction.label}
                </Link>
                <Link href={`/me/projects/${project.workId}`} className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                  项目详情 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[8px] border border-black/8 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-ink">还没有项目</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">你可以先启动一个服装产品想法，也可以发布已经适合公开展示的设计作品。</p>
          <Link href="/start" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            启动第一个项目
          </Link>
          <Link href="/publish" className="mt-3 block text-sm font-semibold text-ink/45 hover:text-ink">
            已有完整作品，去发布作品
          </Link>
        </section>
      )}
    </div>
  );
}
