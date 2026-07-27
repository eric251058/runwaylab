import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Bell, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { SafeImage } from "@/components/media/SafeImage";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import {
  APPLICATION_STATUS_LABELS,
  PROJECT_WORKBENCH_STAGES,
  PROJECT_WORKBENCH_STAGE_LABELS,
  PROVIDER_WORK_PROPOSAL_STATUS_LABELS,
  PROVIDER_WORK_PROPOSAL_TYPE_LABELS,
  RECOMMENDATION_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  getDesignerProjectWorkbenchDetail,
  redactPrivateContact,
  shortText,
  summarizeCooperationRequest,
  summarizeFabricRequest,
  summarizeProviderProposal,
  summarizeSampleRequest
} from "@/lib/project-workbench";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-[8px] border border-black/8 bg-white p-5">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[8px] bg-paper p-4 text-sm text-ink/55">{children}</p>;
}

function statusPill(label: string) {
  return <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{label}</span>;
}

export default async function MeProjectDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/projects");

  const { id } = await params;
  const project = await getDesignerProjectWorkbenchDetail(user.id, id);
  if (!project) notFound();

  const activeStageIndex = PROJECT_WORKBENCH_STAGES.indexOf(project.stage);
  const work = project.work;
  const outgoingInquiries = work.cooperationRequests.filter((item) => Boolean(item.providerId));
  const cooperationRequests = work.cooperationRequests.filter((item) => !item.providerId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">返回项目工作台</Link>

      <header className="mt-4 grid gap-5 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] lg:grid-cols-[260px_1fr]">
        <SafeImage src={visualFor(0, project.imageUrl)} alt={project.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" placeholder="作品封面" />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{project.stageLabel}</span>
            {statusPill(`等待：${project.waitingFor}`)}
            {statusPill(`待处理 ${project.pendingCount}`)}
            {project.unreadNotificationCount ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">未读通知 {project.unreadNotificationCount}</span> : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-ink md:text-5xl">{project.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58">{project.description}</p>
          <p className="mt-3 text-sm leading-6 text-ink/62">{project.statusDescription}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={project.nextAction.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white">
              {project.nextAction.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/works/${project.workId}`} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
              查看作品
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">项目阶段</h2>
            <p className="mt-1 text-sm text-ink/50">阶段由真实业务对象实时计算，通知不参与核心状态判断。</p>
          </div>
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-ink/45"><Clock className="h-4 w-4" />{formatDate(project.lastUpdatedAt)}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {PROJECT_WORKBENCH_STAGES.map((stage, index) => {
            const isActive = stage === project.stage;
            const isPast = index < activeStageIndex && project.stage !== "CANCELLED";
            return (
              <div key={stage} className={`min-h-16 rounded-[6px] border px-3 py-2 text-xs font-semibold ${isActive ? "border-ink bg-ink text-white" : isPast ? "border-black/8 bg-paper text-ink/70" : "border-black/8 bg-white text-ink/35"}`}>
                {isPast ? <CheckCircle2 className="mb-1 h-3.5 w-3.5" /> : null}
                {PROJECT_WORKBENCH_STAGE_LABELS[stage]}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section title="待处理任务">
            {project.tasks.length ? (
              <div className="space-y-3">
                {project.tasks.map((task) => (
                  <Link key={task.id} href={task.href} className="flex flex-col gap-2 rounded-[8px] bg-paper p-4 transition hover:bg-black/[0.04] md:flex-row md:items-center md:justify-between">
                    <span className="font-semibold text-ink">{task.label}</span>
                    <span className="text-sm text-ink/55">{task.status} / 等待 {task.waitingFor}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty>暂时没有需要你处理的事项。</Empty>}
          </Section>

          <Section id="fabric-requests" title="面料需求">
            {work.fabricRequests.length ? (
              <div className="space-y-3">
                {work.fabricRequests.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(REQUEST_STATUS_LABELS[item.status])}{item.handledAt ? statusPill(`处理于 ${formatDate(item.handledAt)}`) : null}</div>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{shortText(summarizeFabricRequest(item), 180)}</p>
                    {item.adminNote ? <p className="mt-2 text-sm text-ink/50">平台备注：{shortText(item.adminNote, 120)}</p> : null}
                  </article>
                ))}
              </div>
            ) : <Empty>暂无关联面料需求。</Empty>}
          </Section>

          <Section id="fabric-recommendations" title="面料推荐">
            {work.fabricRecommendations.length ? (
              <div className="space-y-3">
                {work.fabricRecommendations.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(RECOMMENDATION_STATUS_LABELS[item.status])}{item.provider ? statusPill(item.provider.name) : null}</div>
                    <h3 className="mt-3 font-semibold text-ink">{item.fabric.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/58">{shortText([item.fabric.composition, item.fabric.weight, item.fabric.width, item.reason].filter(Boolean).join(" / "), 180) || "推荐理由待补充"}</p>
                  </article>
                ))}
              </div>
            ) : <Empty>暂无面料推荐。</Empty>}
          </Section>

          <Section id="sample-requests" title="打样需求">
            {work.sampleRequests.length ? (
              <div className="space-y-3">
                {work.sampleRequests.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(REQUEST_STATUS_LABELS[item.status])}{item.expectedDate ? statusPill(`期望 ${formatDate(item.expectedDate)}`) : null}</div>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{shortText(summarizeSampleRequest(item), 180)}</p>
                    {item.adminNote ? <p className="mt-2 text-sm text-ink/50">平台备注：{shortText(item.adminNote, 120)}</p> : null}
                  </article>
                ))}
              </div>
            ) : <Empty>暂无关联打样需求。</Empty>}
          </Section>

          <Section id="provider-proposals" title="供应商方案">
            {work.providerWorkProposals.length ? (
              <div className="space-y-3">
                {work.providerWorkProposals.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(PROVIDER_WORK_PROPOSAL_TYPE_LABELS[item.type])}{statusPill(PROVIDER_WORK_PROPOSAL_STATUS_LABELS[item.status])}</div>
                    <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 text-sm text-ink/52">{item.provider.name}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/58">{shortText(summarizeProviderProposal(item), 180)}</p>
                  </article>
                ))}
              </div>
            ) : <Empty>暂无供应商方案。</Empty>}
          </Section>

          <Section id="cooperation-requests" title="合作请求">
            {cooperationRequests.length ? (
              <div className="space-y-3">
                {cooperationRequests.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(REQUEST_STATUS_LABELS[item.status])}{statusPill(item.type)}</div>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{shortText(summarizeCooperationRequest(item), 180)}</p>
                  </article>
                ))}
              </div>
            ) : <Empty>暂无站内合作请求。</Empty>}
          </Section>

          <Section id="inquiries" title="询盘">
            {outgoingInquiries.length ? (
              <div className="space-y-3">
                {outgoingInquiries.map((item) => (
                  <article key={item.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-wrap gap-2">{statusPill(REQUEST_STATUS_LABELS[item.status])}{item.provider ? statusPill(item.provider.name) : null}{statusPill(`回复 ${item.replies.length}`)}</div>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{shortText(summarizeCooperationRequest(item), 180)}</p>
                    <Link href="/me/inquiries" className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-ink">去询盘页继续沟通</Link>
                  </article>
                ))}
              </div>
            ) : <Empty>暂无关联服务商询盘。</Empty>}
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="项目概况">
            <div className="grid gap-3">
              <div className="rounded-[8px] bg-paper p-4">
                <p className="text-xs font-semibold text-ink/40">当前状态</p>
                <p className="mt-2 font-semibold text-ink">{project.statusLabel}</p>
              </div>
              <div className="rounded-[8px] bg-paper p-4">
                <p className="text-xs font-semibold text-ink/40">下一步</p>
                <p className="mt-2 font-semibold text-ink">{project.nextAction.label}</p>
              </div>
              <div className="rounded-[8px] bg-paper p-4">
                <p className="text-xs font-semibold text-ink/40">等待对象</p>
                <p className="mt-2 font-semibold text-ink">{project.waitingFor}</p>
              </div>
            </div>
          </Section>

          <Section title="真实项目时间线">
            {project.timeline.length ? (
              <ol className="space-y-3">
                {project.timeline.map((event) => (
                  <li key={event.id} className="rounded-[8px] bg-paper p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{event.title}</p>
                        <p className="mt-1 text-xs text-ink/38">{formatDate(event.at)}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/58">{redactPrivateContact(event.description)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty>暂无时间线事件。</Empty>}
          </Section>

          <Section title="相关通知">
            {project.notifications.length ? (
              <div className="space-y-3">
                {project.notifications.slice(0, 8).map((item) => (
                  <Link key={item.id} href={item.linkUrl ?? "/notifications"} className="block rounded-[8px] bg-paper p-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-ink/45" />
                      <span className="text-xs font-semibold text-ink/38">{formatDate(item.createdAt)}</span>
                      {!item.isRead ? <span className="h-2 w-2 rounded-full bg-ink" /> : null}
                    </div>
                    <p className="mt-2 font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/55">{redactPrivateContact(item.content)}</p>
                  </Link>
                ))}
              </div>
            ) : <Empty>暂无可归类到该作品的通知。</Empty>}
          </Section>

          <Section title="入口">
            <div className="grid gap-2">
              <Link href={`/incubation/fabric-request?workId=${project.workId}`} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">提交面料需求</Link>
              <Link href={`/incubation/sample-request?workId=${project.workId}`} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">提交打样需求</Link>
              <Link href="/me/inquiries" className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">我的询盘</Link>
              <Link href="/notifications" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink"><ListChecks className="h-4 w-4" />通知中心</Link>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
