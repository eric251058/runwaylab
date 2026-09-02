import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, Clock } from "lucide-react";
import { PrivateProjectActionCard, type PrivateProjectActionCardAction } from "@/components/projects/PrivateProjectActionCard";
import { ProjectCommercialTerms } from "@/components/projects/ProjectCommercialTerms";
import { ProjectTransactionRecord } from "@/components/projects/ProjectTransactionRecord";
import { ProjectNegotiationComposer } from "@/components/projects/ProjectNegotiationComposer";
import { ProjectCommerceStages } from "@/components/projects/ProjectCommerceStages";
import { ProjectMarketValidation } from "@/components/projects/ProjectMarketValidation";
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
  IDEA: "需求",
  DEVELOPMENT: "设计开发",
  PRESALE: "市场验证",
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
    <ol className="grid grid-cols-4 gap-2" aria-label="项目阶段">
      {keys.map((key, index) => {
        const reached = index <= activeIndex;
        const active = index === activeIndex;

        return (
          <li key={key} className="relative min-w-0 text-center">
            <div className="relative flex items-center">
              <span className={"h-px flex-1 " + (index === 0 ? "bg-transparent" : reached ? "bg-ink" : "bg-black/10")} />
              <span
                aria-current={active ? "step" : undefined}
                className={
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors "
                  + (active ? "bg-ink text-white ring-4 ring-black/6" : reached ? "bg-ink text-white" : "bg-black/6 text-ink/35")
                }
              >
                {index + 1}
              </span>
              <span className={"h-px flex-1 " + (index === keys.length - 1 ? "bg-transparent" : index < activeIndex ? "bg-ink" : "bg-black/10")} />
            </div>
            <p className={"mt-2 truncate text-[11px] font-semibold md:text-xs " + (active ? "text-ink" : "text-ink/40")}>
              {stageLabels[key]}
            </p>
          </li>
        );
      })}
    </ol>
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
  const canManage = user.role === "ADMIN" || project.ownerUserId === user.id || project.projectIntake?.ownerId === user.id;
  const canManageCommerce = project.ownerUserId === user.id || project.projectIntake?.ownerId === user.id;
  const canOpenMarketValidation = project.ownerUserId === user.id || project.projectIntake?.ownerId === user.id;
  const marketValidationEligible = canOpenMarketValidation
    && project.demandMode === "PUBLIC_COCREATION"
    && project.visibility === "PUBLIC"
    && project.designAuthorizations[0]?.status === "ACCEPTED"
    && project.commerceStages.some((stage) => stage.stage === "SAMPLE" && stage.status === "COMPLETED");

  const hasMarketValidation = marketValidationEligible || Boolean(project.presaleCampaign);
  const hasCommercialTerms = Boolean(project.provider) || project.providerWorkProposals.length > 0;
  const hasTransaction = Boolean(project.orders[0]);
  const hasNegotiation = Boolean(project.provider) || project.negotiationMessages.length > 0;
  const hasProjectTools = project.commerceStages.length > 0
    || hasMarketValidation
    || hasCommercialTerms
    || hasTransaction
    || hasNegotiation;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <Link href="/me/projects" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink/52 transition-colors hover:text-ink">
        ← 返回我的项目
      </Link>

      <header className="mt-2 overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-[0_18px_55px_rgba(16,16,16,0.07)]">
        <div className="p-6 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{stageLabels[experience.stage]}</span>
            <span className="text-xs font-semibold text-ink/38">
              {project.visibility === "PUBLIC" ? "公开项目" : "私有项目"}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink md:text-5xl">{project.title}</h1>
          <p className="mt-3 text-sm font-medium text-ink/48">
            {[project.provider?.name, project.summary].filter(Boolean).join(" · ") || "项目正在按计划推进"}
          </p>
        </div>
        <div className="border-t border-black/6 bg-paper/55 px-5 py-5 md:px-9">
          <StageProgress stage={experience.stage} />
        </div>
      </header>

      <section className="mt-5" aria-label="当前任务">
        <PrivateProjectActionCard projectId={project.id} action={currentAction ? serializeAction(currentAction) : null} />
      </section>

      {hasProjectTools ? (
        <section className="mt-5 space-y-5" aria-label="当前阶段工具">
          {project.commerceStages.length ? (
            <ProjectCommerceStages
              projectId={project.id}
              stages={project.commerceStages}
              canManage={canManageCommerce}
              isAdmin={user.role === "ADMIN"}
            />
          ) : null}

          {hasMarketValidation ? (
            <ProjectMarketValidation
              projectId={project.id}
              eligible={marketValidationEligible}
              campaign={project.presaleCampaign ? {
                ...project.presaleCampaign,
                startDate: project.presaleCampaign.startDate?.toISOString() ?? null,
                endDate: project.presaleCampaign.endDate?.toISOString() ?? null
              } : null}
            />
          ) : null}

          {hasCommercialTerms ? (
            <ProjectCommercialTerms
              projectId={project.id}
              providerName={project.provider?.name ?? null}
              canSubmit={project.provider?.ownerId === user.id}
              canDecide={
                user.role === "ADMIN"
                || project.ownerUserId === user.id
                || project.designerId === user.id
                || project.projectIntake?.ownerId === user.id
              }
              proposals={project.providerWorkProposals.map((proposal) => ({
                ...proposal,
                createdAt: proposal.createdAt.toISOString(),
                updatedAt: proposal.updatedAt.toISOString()
              }))}
              milestones={project.milestones.map((milestone) => ({
                id: milestone.id,
                title: milestone.title,
                stage: milestone.stage,
                status: milestone.status,
                dueAt: milestone.dueAt?.toISOString() ?? null,
                completedAt: milestone.completedAt?.toISOString() ?? null,
                note: milestone.note
              }))}
            />
          ) : null}

          {hasTransaction ? (
            <ProjectTransactionRecord
              projectId={project.id}
              viewerId={user.id}
              canBuyerAct={
                project.ownerUserId === user.id
                || project.designerId === user.id
                || project.projectIntake?.ownerId === user.id
              }
              canProviderAct={project.provider?.ownerId === user.id}
              order={project.orders[0] ? {
                ...project.orders[0],
                confirmedAt: project.orders[0].confirmedAt?.toISOString() ?? null,
                createdAt: project.orders[0].createdAt.toISOString(),
                updatedAt: project.orders[0].updatedAt.toISOString(),
                paymentAttempts: project.orders[0].paymentAttempts.map((attempt) => ({
                  ...attempt,
                  capturedAt: attempt.capturedAt?.toISOString() ?? null,
                  createdAt: attempt.createdAt.toISOString()
                })),
                reviews: project.orders[0].reviews.map((review) => ({
                  ...review,
                  createdAt: review.createdAt.toISOString()
                }))
              } : null}
            />
          ) : null}

          {hasNegotiation ? (
            <section className="rounded-[16px] border border-black/8 bg-white p-5 md:p-6">
              <h2 className="text-xl font-semibold text-ink">合作沟通</h2>
              <div className="mt-4 space-y-3">
                {project.negotiationMessages.length ? project.negotiationMessages.map((message) => {
                  const own = message.senderId === user.id;
                  return (
                    <article key={message.id} className={"rounded-[12px] p-4 " + (own ? "ml-6 bg-ink text-white" : "mr-6 bg-paper text-ink")}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className={"text-sm font-semibold " + (own ? "text-white" : "text-ink")}>{own ? "我" : message.sender.nickname}</p>
                        <p className={"text-xs " + (own ? "text-white/55" : "text-ink/40")}>{formatDate(message.createdAt)}</p>
                      </div>
                      <p className={"mt-2 whitespace-pre-wrap break-words text-sm leading-6 " + (own ? "text-white/88" : "text-ink/66")}>{message.body}</p>
                    </article>
                  );
                }) : null}
              </div>
              <ProjectNegotiationComposer projectId={project.id} />
            </section>
          ) : null}
        </section>
      ) : null}

      {timeline.length ? (
        <details className="group mt-5 rounded-[16px] border border-black/8 bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold text-ink/58 marker:content-none">
            项目记录
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 border-t border-black/6 p-5">
            {timeline.slice(0, 8).map((event) => (
              <article key={event.id} className="rounded-[12px] bg-paper p-4">
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
        </details>
      ) : null}
    </main>
  );
}
