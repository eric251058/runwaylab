import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_ORDER_STATUS_LABELS, PROJECT_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import {
  canManageProject,
  PROJECT_AUTHORIZATION_LABELS,
  PROJECT_ISSUE_STATUS_LABELS,
  PROJECT_ISSUE_TYPE_LABELS,
  PROJECT_MILESTONE_STATUS_LABELS,
  PROJECT_ORDER_FULFILLMENT_STATUS_LABELS,
  PROJECT_ORDER_PAYMENT_STATUS_LABELS
} from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function dateText(value?: Date | null) {
  return value ? value.toLocaleDateString("zh-CN") : "待定";
}

export default async function MeProjectDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/projects");

  const enabled = await isFeatureEnabled("feature.project_marketplace_v22");
  if (!enabled) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="text-3xl font-semibold text-ink md:text-5xl">项目工作台</h1>
        <p className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">项目市场功能尚未开放。</p>
      </div>
    );
  }

  const { id } = await params;
  const project = await prisma.collaborationProject.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      work: { select: { id: true, title: true, userId: true } },
      designer: { select: { nickname: true } },
      ownerUser: { select: { nickname: true } },
      ownerProvider: { select: { name: true } },
      designAuthorizations: { orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { createdAt: "asc" } },
      issues: { orderBy: { createdAt: "desc" }, take: 20 },
      providerWorkProposals: { include: { provider: true }, orderBy: { createdAt: "desc" }, take: 20 },
      orders: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!project || !canManageProject(user, project)) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/me/projects" className="text-sm font-semibold text-ink/52 hover:text-ink">返回我的项目</Link>
      <header className="mt-4 rounded-[8px] border border-black/8 bg-white p-5">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
        <h1 className="mt-4 text-3xl font-semibold text-ink md:text-5xl">{project.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">{project.summary ?? project.description ?? "项目正在推进中。"}</p>
        <p className="mt-3 text-sm text-ink/45">作品：{project.work.title} / 负责人：{project.ownerProvider?.name ?? project.ownerUser?.nickname ?? "待确认"}</p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">设计授权</h2>
          <div className="mt-4 space-y-3">
            {project.designAuthorizations.length ? project.designAuthorizations.map((item) => (
              <article key={item.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">
                <p className="font-semibold text-ink">{PROJECT_AUTHORIZATION_LABELS[item.status]}</p>
                <p>范围：{item.scope}</p>
                <p>条款：{item.royaltyDescription ?? "待确认"}</p>
              </article>
            )) : <p className="text-sm text-ink/55">暂无授权记录。</p>}
          </div>
        </section>

        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">里程碑</h2>
          <div className="mt-4 space-y-3">
            {project.milestones.length ? project.milestones.map((item) => (
              <article key={item.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">
                <p className="font-semibold text-ink">{item.title}</p>
                <p>{PROJECT_MILESTONE_STATUS_LABELS[item.status]} / {item.stage} / {dateText(item.dueAt)}</p>
                {item.note ? <p>{item.note}</p> : null}
              </article>
            )) : <p className="text-sm text-ink/55">暂无里程碑。</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">服务商方案</h2>
        <div className="mt-4 space-y-3">
          {project.providerWorkProposals.length ? project.providerWorkProposals.map((proposal) => (
            <article key={proposal.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">
              <p className="font-semibold text-ink">{proposal.title} / {proposal.provider.name}</p>
              <p>{proposal.summary ?? proposal.description ?? "方案说明待补充"}</p>
            </article>
          )) : <p className="text-sm text-ink/55">暂无服务商方案。</p>}
        </div>
      </section>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">预订与订单线索</h2>
        <div className="mt-4 space-y-3">
          {project.orders.length ? project.orders.map((order) => (
            <article key={order.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">
              <p className="font-semibold text-ink">{order.title} x {order.quantity}</p>
              <p>{PROJECT_ORDER_STATUS_LABELS[order.status]} / {PROJECT_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus]} / {PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}</p>
            </article>
          )) : <p className="text-sm text-ink/55">暂无预订或订单线索。</p>}
        </div>
      </section>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">项目问题</h2>
        <div className="mt-4 space-y-3">
          {project.issues.length ? project.issues.map((issue) => (
            <article key={issue.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">
              <p className="font-semibold text-ink">{issue.title}</p>
              <p>{PROJECT_ISSUE_TYPE_LABELS[issue.type]} / {PROJECT_ISSUE_STATUS_LABELS[issue.status]} / {issue.description ?? "无补充说明"}</p>
            </article>
          )) : <p className="text-sm text-ink/55">暂无问题记录。</p>}
        </div>
      </section>
    </div>
  );
}
