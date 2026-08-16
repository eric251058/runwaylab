import Link from "next/link";
import { notFound } from "next/navigation";
import { PresaleCampaignIntentStatus, ReviewStatus } from "@prisma/client";
import { LimitedPreorderPanel } from "@/components/projects/LimitedPreorderPanel";
import { ProjectIssueForm } from "@/components/projects/ProjectIssueForm";
import { getCurrentUser } from "@/lib/auth/session";
import { submitProjectApplication } from "@/lib/project-application-actions";
import { PROJECT_APPLICATION_ROLE_LABELS, PROJECT_APPLICATION_ROLES, projectOpportunityNeeds } from "@/lib/project-applications";
import { PROJECT_ORDER_STATUS_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { canOpenLimitedPreorder, PROJECT_MILESTONE_STATUS_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { visualFor } from "@/components/works/work-visuals";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const [marketplaceEnabled, preorderEnabled] = await Promise.all([
    isFeatureEnabled("feature.project_marketplace_v22"),
    isFeatureEnabled("feature.limited_preorder_v23")
  ]);
  const project = await prisma.collaborationProject.findFirst({
    where: {
      AND: [publicProjectWhere(), { OR: [{ id }, { slug: id }] }]
    },
    include: {
      work: { include: { user: true, images: { orderBy: { sortOrder: "asc" } } } },
      designer: true,
      school: true,
      teacher: true,
      provider: true,
      fabric: true,
      presaleCampaign: {
        include: {
          intents: {
            select: {
              status: true,
              quantity: true
            }
          }
        }
      },
      products: { include: { skus: { where: { enabled: true }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } },
      milestones: { orderBy: { createdAt: "asc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 8 },
      reviews: { where: { status: ReviewStatus.PUBLISHED }, include: { reviewer: true }, orderBy: { createdAt: "desc" }, take: 8 }
    }
  });

  if (!project) notFound();
  const preorderProducts = project.products.filter((product) => canOpenLimitedPreorder(project.status, product.status, project.designerAuthorizationStatus));
  const work = project.work;
  const designerName = project.designer?.nickname ?? work?.user.nickname ?? "待关联";
  const presaleCampaign = project.presaleCampaign;
  const confirmedIntents = presaleCampaign?.intents.filter(
    (intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED
  ) ?? [];
  const confirmedQuantity = confirmedIntents.reduce((total, intent) => total + intent.quantity, 0);
  const demandProgress = presaleCampaign
    ? Math.min(100, Math.round((presaleCampaign.currentCount / Math.max(1, presaleCampaign.targetCount)) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROJECT_PRIORITY_LABELS[project.priority]}</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold text-ink md:text-6xl">{project.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">{project.description ?? "该合作项目正在围绕作品孵化推进资源匹配、打样验证与合作沟通。"}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">参与资源</h2>
          <div className="mt-4 grid gap-3 text-sm text-ink/58 md:grid-cols-2">
            {work && project.workId ? (
              <Link href={`/works/${project.workId}`} className="rounded-[6px] bg-paper p-3 font-semibold text-ink">作品：{work.title}</Link>
            ) : (
              <div className="rounded-[6px] bg-paper p-3 font-semibold text-ink">作品：待关联</div>
            )}
            {work?.userId ? (
              <Link href={`/designers/${work.userId}`} className="rounded-[6px] bg-paper p-3">设计师：{designerName}</Link>
            ) : (
              <div className="rounded-[6px] bg-paper p-3">设计师：{designerName}</div>
            )}
            <div className="rounded-[6px] bg-paper p-3">学校：{project.school?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">老师：{project.teacher?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">服务商：{project.provider?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">面料：{project.fabric?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">预售活动：{project.presaleCampaign?.title ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">目标：{project.targetQuantity ?? "待定"} / {project.estimatedBudget ?? "预算待定"}</div>
          </div>
        </section>

        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">当前进展</h2>
          <img src={visualFor(0, work?.images[0])} alt={work?.title ?? project.title} className="mt-4 aspect-[4/3] w-full rounded-[6px] object-cover" />
          <p className="mt-4 text-sm leading-6 text-ink/58">当前阶段：{PROJECT_STATUS_LABELS[project.status]}</p>
          <p className="mt-1 text-sm leading-6 text-ink/58">预售验证：{project.presaleCampaign?.title ?? "待开启"}</p>
          <p className="mt-1 text-sm leading-6 text-ink/58">下一步：继续确认资源、打样和市场反馈。</p>
        </section>
      </div>

      {presaleCampaign ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Market validation</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">市场验证</h2>
            </div>
            <p className="text-sm font-semibold text-ink/45">{presaleCampaign.title}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[6px] bg-paper p-4">
              <p className="text-xs font-semibold text-ink/40">有效意向数量</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{presaleCampaign.currentCount}</p>
            </div>
            <div className="rounded-[6px] bg-paper p-4">
              <p className="text-xs font-semibold text-ink/40">已人工确认</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{confirmedQuantity}</p>
              <p className="mt-1 text-xs text-ink/40">{confirmedIntents.length} 位意向用户</p>
            </div>
            <div className="rounded-[6px] bg-paper p-4">
              <p className="text-xs font-semibold text-ink/40">目标数量</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{presaleCampaign.targetCount}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/8" aria-label={`市场验证进度 ${demandProgress}%`}>
            <div className="h-full rounded-full bg-ink" style={{ width: `${demandProgress}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/45">
            当前进度 {demandProgress}%。以上数据为未付款购买意向及人工确认结果，不代表已成交订单或平台收入；正式交易以项目开启预订并完成付款为准。
          </p>
        </section>
      ) : null}

      {preorderEnabled && preorderProducts.length ? (
        <div className="mt-8">
          <LimitedPreorderPanel
            projectId={project.slug ?? project.id}
            isLoggedIn={Boolean(currentUser)}
            products={preorderProducts.map((product) => ({
              id: product.id,
              title: product.title,
              price: product.price,
              currency: product.currency,
              skus: product.skus.map((sku) => ({
                id: sku.id,
                size: sku.size,
                color: sku.color,
                priceOverride: sku.priceOverride
              }))
            }))}
          />
        </div>
      ) : null}

      {marketplaceEnabled && project.milestones.length ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">项目进度</h2>
          <div className="mt-4 space-y-3">
            {project.milestones.map((milestone) => (
              <article key={milestone.id} className="rounded-[6px] bg-paper p-3 text-sm text-ink/58">
                <p className="font-semibold text-ink">{milestone.title}</p>
                <p className="mt-1">{PROJECT_MILESTONE_STATUS_LABELS[milestone.status]} / {milestone.stage}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {marketplaceEnabled ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-ink/38">OPEN COLLABORATION</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">参与这个项目</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/58">选择你能贡献的角色，直接向项目主理人说明合作价值。申请不是雇佣、订单或付款承诺，合作条件由双方后续自主确认。</p>
            </div>
            <Link href="/me/project-applications" className="inline-flex min-h-10 items-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">我的申请与审核</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {projectOpportunityNeeds(project).map((need) => (
              <span key={need.key} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{need.label}</span>
            ))}
          </div>
          {currentUser ? (
            [project.designerId, project.ownerUserId, project.createdById, project.work?.userId].includes(currentUser.id) ? (
              <p className="mt-5 rounded-[8px] bg-black/[0.025] p-4 text-sm text-ink/58">你是该项目的发起或负责方，可前往“我的申请与审核”管理参与者。</p>
            ) : (
              <form action={submitProjectApplication} className="mt-5 grid gap-4">
                <input type="hidden" name="projectId" value={project.id} />
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  希望参与的角色
                  <select name="role" required className="min-h-11 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-normal outline-none focus:border-ink/40">
                    {PROJECT_APPLICATION_ROLES.map((role) => <option key={role} value={role}>{PROJECT_APPLICATION_ROLE_LABELS[role]}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  你能带来的合作价值
                  <textarea name="message" required minLength={10} maxLength={500} rows={4} placeholder="例如：可承接小单快反打样，并提供预计周期与过往品类经验。" className="rounded-[8px] border border-black/10 p-3 text-sm font-normal leading-6 outline-none focus:border-ink/40" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  相关经验（可选）
                  <textarea name="experience" maxLength={500} rows={3} placeholder="描述能力与经历即可；无需在此公开手机号、邮箱或微信。" className="rounded-[8px] border border-black/10 p-3 text-sm font-normal leading-6 outline-none focus:border-ink/40" />
                </label>
                <button className="inline-flex min-h-11 w-fit items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">提交参与申请</button>
              </form>
            )
          ) : (
            <Link href={"/login?next=/projects/" + (project.slug ?? project.id)} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">登录后申请参与</Link>
          )}
        </section>
      ) : null}

      {marketplaceEnabled ? <ProjectIssueForm projectId={project.slug ?? project.id} isLoggedIn={Boolean(currentUser)} /> : null}

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">合作线索</h2>
          <div className="mt-4 space-y-3">
            {project.orders.length ? project.orders.map((order) => (
              <article key={order.id} className="rounded-[6px] bg-paper p-3 text-sm text-ink/58">
                <p className="font-semibold text-ink">{order.title}</p>
                <p className="mt-1">{[order.quantityNote, order.amountNote, order.deliveryNote].filter(Boolean).join(" / ") || "细节待线下确认"}</p>
                <p className="mt-1 text-xs font-semibold text-ink/40">{PROJECT_ORDER_STATUS_LABELS[order.status]}</p>
              </article>
            )) : <p className="text-sm text-ink/55">暂无项目意向记录。</p>}
          </div>
      </section>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">公开评价</h2>
        <div className="mt-4 space-y-3">
          {project.reviews.length ? project.reviews.map((review) => (
            <article key={review.id} className="rounded-[6px] bg-paper p-3">
              <p className="text-sm font-semibold text-ink">{review.reviewer.nickname} / {review.rating} 分</p>
              <p className="mt-1 text-sm leading-6 text-ink/58">{review.content ?? "暂无文字评价"}</p>
            </article>
          )) : <p className="text-sm text-ink/55">暂无公开评价。</p>}
        </div>
      </section>
    </div>
  );
}
