import Link from "next/link";
import { notFound } from "next/navigation";
import { LimitedPreorderQualificationMode, LimitedPreorderStatus, PresaleCampaignIntentStatus, ReviewStatus } from "@prisma/client";
import { LimitedPreorderPanel } from "@/components/projects/LimitedPreorderPanel";
import { ProjectIssueForm } from "@/components/projects/ProjectIssueForm";
import { StageProposalForm } from "@/components/projects/StageProposalForm";
import { getCurrentUser } from "@/lib/auth/session";
import { submitProjectApplication } from "@/lib/project-application-actions";
import { PROJECT_APPLICATION_ROLE_LABELS, PROJECT_APPLICATION_ROLES, projectOpportunityNeeds } from "@/lib/project-applications";
import { PROJECT_ORDER_STATUS_LABELS, PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { hasCurrentLimitedPreorderAuthorization, LIMITED_PREORDER_QUALIFICATION_LABELS, LIMITED_PREORDER_STATUS_LABELS } from "@/lib/projects/preorder-lifecycle";
import { createLimitedPreorderOfferEnvelope, hashLimitedPreorderOfferSnapshot, readLimitedPreorderOfferSnapshot } from "@/lib/projects/preorder-offer";
import { hasVerifiedBuyerContact, PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT } from "@/lib/projects/preorder-buyer-cap";
import { canOpenLimitedPreorder, PROJECT_MILESTONE_STATUS_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { visualFor } from "@/components/works/work-visuals";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatPreorderDateTime(value?: Date | null) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(value);
}

function limitedPreorderPublicNotice(
  status: LimitedPreorderStatus,
  submissionEnabled: boolean,
  mode: LimitedPreorderQualificationMode
) {
  switch (status) {
    case LimitedPreorderStatus.OPEN:
      return submissionEnabled
        ? "本期正在接收限量预售订单，请先核对商品、规格、截止时间、预计发货与条款正文。"
        : "活动状态仍为开放，但新提交入口当前已关闭；已有未付款订单意向及其核验、履约记录仍会保留。";
    case LimitedPreorderStatus.PAUSED:
      return "本期已暂停接单。已有订单继续保留并按订单中心状态处理，恢复时间以平台后续说明为准。";
    case LimitedPreorderStatus.GOAL_REACHED:
      return "本期已达到成团目标，正在等待平台确认进入生产；达标不等于已经发货。";
    case LimitedPreorderStatus.FAILED:
      return mode === LimitedPreorderQualificationMode.PAID_ORDER
        ? "本期未达到成团目标，未付款订单将关闭；已付款订单进入原路退款，退款完成以支付宝回执和个人订单记录为准。"
        : "本期未达到成团目标，未付款订单意向将关闭；本期未在线收款，也不产生平台退款流程。";
    case LimitedPreorderStatus.CANCELLED:
      return mode === LimitedPreorderQualificationMode.PAID_ORDER
        ? "本期已取消，未付款订单将关闭；已付款订单进入原路退款，退款完成以支付宝回执和个人订单记录为准。"
        : "本期已取消，未付款订单意向将关闭；本期未在线收款，也不产生平台退款流程。";
    case LimitedPreorderStatus.PRODUCTION:
      return "本期已进入生产。预计发货仍是计划时间，具体生产、质检和发货进度以个人订单记录为准。";
    case LimitedPreorderStatus.CLOSED:
      return "本期已结束归档，不再接收新订单意向；历史核验与履约记录仍可在个人订单中心查看。";
    case LimitedPreorderStatus.NOT_STARTED:
      return "本期尚未开始。";
  }
}

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
      designAuthorizations: {
        select: {
          status: true,
          preorderCampaignId: true,
          workId: true,
          designerUserId: true,
          ownerUserId: true,
          termsVersion: true,
          offerHash: true,
          offerSnapshot: true
        },
        take: 1
      },
      milestones: { orderBy: { createdAt: "asc" } },
      orders: { where: { preorderCampaignId: null }, orderBy: { createdAt: "desc" }, take: 8 },
      reviews: { where: { status: ReviewStatus.PUBLISHED }, include: { reviewer: true }, orderBy: { createdAt: "desc" }, take: 8 }
      ,commerceStages: { include: { proposals: { select: { id: true, status: true } } }, orderBy: { createdAt: "asc" } }
    }
  });

  if (!project) notFound();
  const openCommerceStage = project.commerceStages.find((stage) => stage.status === "OPEN" || stage.status === "SELECTION_PENDING") as (typeof project.commerceStages[number] & { commitmentStatus: string }) | undefined;
  const canSubmitStageProposal = Boolean(openCommerceStage
    && (openCommerceStage.stage !== "DESIGN" || ["NOT_REQUIRED", "VERIFIED"].includes(openCommerceStage.commitmentStatus))
    && openCommerceStage.proposals.filter((proposal) => ["SUBMITTED", "SHORTLISTED"].includes(proposal.status)).length < 5);
  const work = project.work;
  const designerName = project.designer?.nickname ?? work?.user.nickname ?? "待关联";
  const presaleCampaign = project.presaleCampaign;
  const workPublicReady = Boolean(work && isPublicQualityWork(work));
  const preorderProducts = presaleCampaign?.preorderStatus === LimitedPreorderStatus.OPEN && workPublicReady
    ? project.products.filter((product) => canOpenLimitedPreorder(project.status, product.status, project.designerAuthorizationStatus))
    : [];
  const preorderLifecycleStarted = Boolean(presaleCampaign && presaleCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED);
  const now = new Date();
  const preorderDeadlinePassed = Boolean(presaleCampaign?.preorderDeadline && presaleCampaign.preorderDeadline <= now);
  const authorization = project.designAuthorizations[0] ?? null;
  const authorizationSnapshot = readLimitedPreorderOfferSnapshot(authorization?.offerSnapshot);
  const verifiedAuthorizationOfferHash = authorizationSnapshot
    && authorization?.offerHash
    && hashLimitedPreorderOfferSnapshot(authorizationSnapshot) === authorization.offerHash
    ? authorization.offerHash
    : null;
  const currentOffer = presaleCampaign && work ? createLimitedPreorderOfferEnvelope({
    projectId: project.id,
    projectTitle: project.title,
    projectDescription: project.description,
    projectTargetQuantity: project.targetQuantity,
    projectEstimatedBudget: project.estimatedBudget,
    workTitle: work.title,
    workDescription: work.description,
    campaign: presaleCampaign,
    products: project.products,
    displayImageUrls: work.images.map((image) => image.imageUrl),
    now
  }) : null;
  const currentAuthorizationValid = Boolean(presaleCampaign && work && currentOffer && hasCurrentLimitedPreorderAuthorization({
    campaignId: presaleCampaign.id,
    campaignWorkId: presaleCampaign.workId,
    projectWorkId: project.workId,
    workOwnerUserId: work.userId,
    projectOwnerUserId: project.ownerUserId ?? project.createdById,
    projectAuthorizationStatus: project.designerAuthorizationStatus,
    authorizationRecordStatus: authorization?.status ?? null,
    authorizationPreorderCampaignId: authorization?.preorderCampaignId ?? null,
    authorizationRecordWorkId: authorization?.workId ?? null,
    authorizationDesignerUserId: authorization?.designerUserId ?? null,
    authorizationOwnerUserId: authorization?.ownerUserId ?? null,
    authorizationTermsVersion: authorization?.termsVersion ?? null,
    authorizationOfferHash: verifiedAuthorizationOfferHash,
    currentOfferHash: currentOffer.hash
  }));
  const canSubmitLimitedPreorder = Boolean(
    preorderEnabled
    && presaleCampaign?.preorderStatus === LimitedPreorderStatus.OPEN
    && presaleCampaign.preorderDeadline
    && presaleCampaign.preorderDeadline > now
    && preorderProducts.length
    && currentOffer?.issues.length === 0
    && currentAuthorizationValid
  );
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
        {project.commerceStages.length ? <section className="rounded-[8px] border border-black/8 bg-white p-5 lg:col-span-2">
          <h2 className="text-2xl font-semibold text-ink">需求共创进度</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">{project.commerceStages.map((stage, index) => <div key={stage.id} className="rounded-[8px] bg-paper p-4"><p className="text-xs font-semibold text-ink/40">阶段 {index + 1}</p><p className="mt-1 font-semibold">{stage.title}</p><p className="mt-2 text-xs text-ink/48">{stage.status === "BLOCKED" ? "等待上一阶段" : stage.status === "OPEN" ? "开放征集" : stage.status === "COMPLETED" ? "已完成" : "推进中"} · {stage.proposals.length} 个方案</p></div>)}</div>
          {canSubmitStageProposal && openCommerceStage ? <StageProposalForm projectId={project.id} stageId={openCommerceStage.id} loggedIn={Boolean(currentUser)} /> : openCommerceStage?.stage === "DESIGN" && !["NOT_REQUIRED", "VERIFIED"].includes(openCommerceStage.commitmentStatus) ? <p className="mt-4 rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-950">需求方正在完成项目启动金认证。认证后才开放设计师响应，避免无预算的试探性需求。</p> : openCommerceStage ? <p className="mt-4 rounded-[8px] bg-paper p-4 text-sm text-ink/55">本阶段已收到 5 个有效候选方案，暂不再增加候选人。</p> : null}
        </section> : null}
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
            当前进度 {demandProgress}%。以上数据为未付款购买意向及人工确认结果，不代表已成交订单或平台收入；V2.3 首期只记录经平台人工核验的订单意向，不在线收款、不收定金。
          </p>
        </section>
      ) : null}

      {canSubmitLimitedPreorder ? (
        <div className="mt-8">
          <LimitedPreorderPanel
            projectId={project.slug ?? project.id}
            isLoggedIn={Boolean(currentUser)}
            buyerContactVerified={Boolean(currentUser && hasVerifiedBuyerContact(currentUser))}
            buyerQuantityLimit={PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT}
            campaign={{
              title: presaleCampaign!.title,
              targetQuantity: presaleCampaign!.preorderTargetQuantity!,
              capacity: presaleCampaign!.preorderCapacity!,
              deadline: presaleCampaign!.preorderDeadline!.toISOString(),
              qualificationMode: presaleCampaign!.preorderQualificationMode,
              termsVersion: presaleCampaign!.preorderTermsVersion,
              termsText: presaleCampaign!.preorderTermsText!,
              paymentInstructions: presaleCampaign!.preorderPaymentInstructions
            }}
            products={preorderProducts.map((product) => ({
              id: product.id,
              title: product.title,
              description: product.description,
              materialDescription: product.materialDescription,
              careInstructions: product.careInstructions,
              imageStage: product.imageStage,
              price: product.price,
              currency: product.currency,
              preorderLimit: product.preorderLimit!,
              estimatedShipDate: product.estimatedShipDate?.toISOString() ?? null,
              skus: product.skus.map((sku) => ({
                id: sku.id,
                size: sku.size,
                color: sku.color,
                priceOverride: sku.priceOverride,
                capacity: sku.capacity
              }))
            }))}
          />
        </div>
      ) : preorderLifecycleStarted && presaleCampaign ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Limited Preorder</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{presaleCampaign.title}</h2>
            </div>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{LIMITED_PREORDER_STATUS_LABELS[presaleCampaign.preorderStatus]}</span>
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">成团目标</p><p className="mt-1 font-semibold">{presaleCampaign.preorderTargetQuantity !== null ? `${presaleCampaign.preorderTargetQuantity} 件` : "未记录"}</p></div>
            <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">成团口径</p><p className="mt-1 font-semibold">{LIMITED_PREORDER_QUALIFICATION_LABELS[presaleCampaign.preorderQualificationMode]}</p></div>
            <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">本期总限量</p><p className="mt-1 font-semibold">{presaleCampaign.preorderCapacity !== null ? `${presaleCampaign.preorderCapacity} 件` : "未记录"}</p></div>
            <div className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">预售截止</p><p className="mt-1 font-semibold">{formatPreorderDateTime(presaleCampaign.preorderDeadline)}</p></div>
          </div>
          <p className="mt-4 rounded-[6px] border border-black/8 bg-paper p-3 text-sm leading-6 text-ink/58">
            {presaleCampaign.preorderStatus === LimitedPreorderStatus.OPEN && preorderDeadlinePassed
              ? "本期预售已截止，正在等待平台按真实订单意向结算；当前不再接受新提交。"
              : limitedPreorderPublicNotice(presaleCampaign.preorderStatus, canSubmitLimitedPreorder, presaleCampaign.preorderQualificationMode)}
          </p>
          {presaleCampaign.preorderPublicNotice ? <p className="mt-3 text-sm leading-6 text-ink/58"><span className="font-semibold text-ink">平台状态说明：</span>{presaleCampaign.preorderPublicNotice}</p> : null}
          {presaleCampaign.preorderStatus === LimitedPreorderStatus.OPEN && preorderEnabled && workPublicReady && !preorderProducts.length ? <p className="mt-3 text-sm font-semibold text-red-700">当前没有可下单商品，请联系 RunwayLab 平台核对活动配置。</p> : null}
          {presaleCampaign.preorderStatus === LimitedPreorderStatus.OPEN && preorderEnabled && (!currentAuthorizationValid || currentOffer?.issues.length) ? <p className="mt-3 text-sm font-semibold text-red-700">作者授权或公开开售资料已发生变化，新提交已安全停止；已有记录仍保留，请等待平台处理。</p> : null}
          {presaleCampaign.preorderStatus === LimitedPreorderStatus.OPEN && !workPublicReady ? <p className="mt-3 text-sm font-semibold text-red-700">关联作品当前未达到公开质量或审核要求，本期已停止接受新提交，等待平台处理。</p> : null}
        </section>
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
