import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { PrivateProjectActionCard, type PrivateProjectActionCardAction } from "@/components/projects/PrivateProjectActionCard";
import { ProjectNegotiationComposer } from "@/components/projects/ProjectNegotiationComposer";
import { getCurrentUser } from "@/lib/auth/session";
import {
  privateProjectCurrentAction,
  getPrivateCollaborationProjectForViewer,
  getProjectExperienceStage,
  privateProjectTimeline
} from "@/lib/private-collaboration-projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的项目",
  robots: {
    index: false,
    follow: false
  }
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const stageLabels = {
  IDEA: "想法",
  DEVELOPMENT: "开发",
  PRESALE: "预售",
  PRODUCTION: "生产"
} as const;

type StageKey = keyof typeof stageLabels;

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

function StageProgress({ stage }: { stage: StageKey }) {
  const keys = Object.keys(stageLabels) as StageKey[];
  const activeIndex = keys.indexOf(stage);

  return (
    <div className="grid grid-cols-4 items-center gap-2 text-center text-xs font-semibold text-ink/38" aria-label="项目阶段">
      {keys.map((key, index) => (
        <div key={key} className="min-w-0">
          <div className={`h-1.5 rounded-full ${index <= activeIndex ? "bg-ink" : "bg-black/10"}`} />
          <p className={`mt-2 truncate ${index === activeIndex ? "text-ink" : ""}`}>{stageLabels[key]}</p>
        </div>
      ))}
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
  const experience = getProjectExperienceStage(project);
  const timeline = privateProjectTimeline(project);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">
        返回我的项目
      </Link>

      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-7">
        <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">{project.title}</h1>
        {project.provider ? <p className="mt-3 text-sm font-semibold text-ink/52">合作服务商：{project.provider.name}</p> : null}
        {project.summary ? <p className="mt-3 text-sm leading-6 text-ink/62">{project.summary}</p> : null}
        <div className="mt-6">
          <StageProgress stage={experience.stage} />
        </div>
      </header>

      <div className="mt-5 grid gap-5">
        <PrivateProjectActionCard projectId={project.id} action={currentAction ? serializeAction(currentAction) : null} />

        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">合作洽谈</h2>
          <p className="mt-2 text-sm leading-6 text-ink/52">这里仅对作品方、已邀请服务商和管理员可见。关键报价与交付约定请留在这里，避免口头信息丢失。</p>
          <div className="mt-4 space-y-3">
            {project.negotiationMessages.length ? project.negotiationMessages.map((message) => {
              const own = message.senderId === user.id;
              return (
                <article key={message.id} className={"rounded-[8px] p-4 " + (own ? "ml-6 bg-ink text-white" : "mr-6 bg-paper text-ink")}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className={"text-sm font-semibold " + (own ? "text-white" : "text-ink")}>{own ? "我" : message.sender.nickname}</p>
                    <p className={"text-xs " + (own ? "text-white/55" : "text-ink/40")}>{formatDate(message.createdAt)}</p>
                  </div>
                  <p className={"mt-2 whitespace-pre-wrap break-words text-sm leading-6 " + (own ? "text-white/88" : "text-ink/66")}>{message.body}</p>
                </article>
              );
            }) : (
              <div className="rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/52">尚无洽谈消息。第一条消息应明确合作范围，而不是只交换联系方式。</div>
            )}
          </div>
          <ProjectNegotiationComposer projectId={project.id} />
        </section>

        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">历史记录</h2>
          <div className="mt-4 space-y-3">
            {timeline.slice(0, 8).map((event) => (
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
    </main>
  );
}
