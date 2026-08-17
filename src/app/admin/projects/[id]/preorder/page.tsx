import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CollaborationProjectStatus,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  PresaleCampaignIntentStatus,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { dateInputValue } from "@/lib/commercial-collaboration";
import { saveProjectProduct, saveProjectSku } from "@/lib/commercial-collaboration-actions";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { assignCollaborationProjectOwner } from "@/lib/projects/owner-actions";
import {
  cancelLimitedPreorderCampaign,
  closeLimitedPreorderCampaign,
  configureLimitedPreorderCampaign,
  openLimitedPreorderCampaign,
  pauseLimitedPreorderCampaign,
  prepareLimitedPreorderProjectForOpening,
  resumeLimitedPreorderCampaign,
  settleLimitedPreorderCampaign,
  startLimitedPreorderProduction
} from "@/lib/projects/preorder-lifecycle-actions";
import {
  evaluateLimitedPreorderAdmission,
  hasCurrentLimitedPreorderAuthorization,
  LIMITED_PREORDER_NO_PAYMENT_NOTICE,
  LIMITED_PREORDER_QUALIFICATION_LABELS,
  LIMITED_PREORDER_STATUS_LABELS,
  summarizeLimitedPreorderOrders
} from "@/lib/projects/preorder-lifecycle";
import {
  createLimitedPreorderOfferEnvelope,
  hashLimitedPreorderOfferSnapshot,
  readLimitedPreorderOfferSnapshot
} from "@/lib/projects/preorder-offer";
import { PROJECT_AUTHORIZATION_LABELS, PROJECT_PRODUCT_STATUS_LABELS, formatMoneyCents } from "@/lib/projects/rules";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ownerQuery?: string | string[] }>;
};

function dateTimeInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

async function assignCollaborationProjectOwnerFormAction(formData: FormData) {
  "use server";
  await assignCollaborationProjectOwner(formData);
}

export default async function AdminPreorderPreparationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const rawOwnerQuery = Array.isArray(resolvedSearchParams.ownerQuery)
    ? resolvedSearchParams.ownerQuery[0]
    : resolvedSearchParams.ownerQuery;
  const ownerQuery = rawOwnerQuery?.trim().slice(0, 80) ?? "";
  const [project, preorderEnabled, ownerCandidates] = await Promise.all([
    prisma.collaborationProject.findUnique({
      where: { id },
      include: {
        work: {
          select: {
            userId: true,
            title: true,
            description: true,
            reviewStatus: true,
            contentStatus: true,
            visibility: true,
            images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } }
          }
        },
        presaleCampaign: { include: { intents: { select: { status: true, quantity: true } } } },
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
        ownerUser: { select: { id: true, nickname: true, role: true, status: true } },
        createdBy: { select: { id: true, nickname: true, role: true, status: true } },
        products: { include: { skus: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { orders: true } }
      }
    }),
    isFeatureEnabled("feature.limited_preorder_v23"),
    prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: { not: UserRole.ADMIN },
        ...(ownerQuery
          ? {
              OR: [
                { id: ownerQuery },
                { nickname: { contains: ownerQuery, mode: "insensitive" as const } },
                { email: { contains: ownerQuery, mode: "insensitive" as const } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        role: true,
        persona: true
      },
      orderBy: { createdAt: "asc" },
      take: 50
    })
  ]);
  if (!project) notFound();

  const campaign = project.presaleCampaign;
  const [orders, linkedProjectCount] = campaign
    ? await Promise.all([
        prisma.projectOrder.findMany({
          where: { projectId: project.id, preorderCampaignId: campaign.id },
          select: { id: true, quantity: true, status: true, paymentStatus: true, fulfillmentStatus: true, confirmedAt: true, confirmedById: true, confirmationChannel: true, confirmationEvidenceRef: true, confirmationSummary: true, productSnapshot: true },
          orderBy: { createdAt: "asc" }
        }),
        prisma.collaborationProject.count({ where: { presaleCampaignId: campaign.id } })
      ])
    : [[], 0];

  const authorization = project.designAuthorizations[0] ?? null;
  const currentOffer = campaign
    ? createLimitedPreorderOfferEnvelope({
        projectId: project.id,
        projectTitle: project.title,
        projectDescription: project.description,
        projectTargetQuantity: project.targetQuantity,
        projectEstimatedBudget: project.estimatedBudget,
        workTitle: project.work?.title ?? "",
        workDescription: project.work?.description ?? null,
        campaign,
        products: project.products,
        displayImageUrls: project.work?.images.map((image) => image.imageUrl) ?? []
      })
    : null;
  const authorizationSnapshot = readLimitedPreorderOfferSnapshot(authorization?.offerSnapshot);
  const verifiedAuthorizationOfferHash = authorizationSnapshot
    && authorization?.offerHash
    && hashLimitedPreorderOfferSnapshot(authorizationSnapshot) === authorization.offerHash
    ? authorization.offerHash
    : null;
  const authorizationReady = Boolean(campaign && hasCurrentLimitedPreorderAuthorization({
    campaignId: campaign.id,
    campaignWorkId: campaign.workId,
    projectWorkId: project.workId,
    workOwnerUserId: project.work?.userId ?? null,
    projectOwnerUserId: project.ownerUserId ?? project.createdById,
    projectAuthorizationStatus: project.designerAuthorizationStatus,
    authorizationRecordStatus: authorization?.status ?? null,
    authorizationPreorderCampaignId: authorization?.preorderCampaignId ?? null,
    authorizationRecordWorkId: authorization?.workId ?? null,
    authorizationDesignerUserId: authorization?.designerUserId ?? null,
    authorizationOwnerUserId: authorization?.ownerUserId ?? null,
    authorizationTermsVersion: authorization?.termsVersion ?? null,
    authorizationOfferHash: verifiedAuthorizationOfferHash,
    currentOfferHash: currentOffer?.hash ?? null
  }));
  const unlockedLifecycleStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.NOT_STARTED,
    LimitedPreorderStatus.CLOSED
  ];
  const lifecycleLocked = Boolean(campaign && !unlockedLifecycleStatuses.includes(campaign.preorderStatus));
  const authorizationDecisionLocked = authorization?.status === "PENDING" || authorization?.status === "ACCEPTED";
  const preparationLocked = lifecycleLocked || authorizationDecisionLocked;
  const confirmedDemandQuantity = campaign?.intents
    .filter((intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED)
    .reduce((sum, intent) => sum + intent.quantity, 0) ?? 0;
  const resumeAdmission = campaign?.preorderStatus === LimitedPreorderStatus.PAUSED;
  const admission = campaign
    ? evaluateLimitedPreorderAdmission({
        campaignId: campaign.id,
        linkedProjectCount,
        campaignWorkId: campaign.workId,
        projectWorkId: project.workId,
        workOwnerUserId: project.work?.userId ?? null,
        projectOwnerUserId: project.ownerUserId ?? project.createdById,
        publicWorkReady: Boolean(project.work && isPublicQualityWork(project.work)),
        projectStatus: project.status,
        projectVisibility: project.visibility,
        projectAuthorizationStatus: project.designerAuthorizationStatus,
        authorizationRecordStatus: project.designAuthorizations[0]?.status ?? null,
        authorizationPreorderCampaignId: project.designAuthorizations[0]?.preorderCampaignId ?? null,
        authorizationRecordWorkId: project.designAuthorizations[0]?.workId ?? null,
        authorizationDesignerUserId: project.designAuthorizations[0]?.designerUserId ?? null,
        authorizationOwnerUserId: project.designAuthorizations[0]?.ownerUserId ?? null,
        authorizationTermsVersion: project.designAuthorizations[0]?.termsVersion ?? null,
        authorizationOfferHash: verifiedAuthorizationOfferHash,
        currentOfferHash: currentOffer?.hash ?? null,
        demandTargetQuantity: campaign.targetCount,
        confirmedDemandQuantity,
        demandCampaignStatus: campaign.status,
        preorderStatus: campaign.preorderStatus,
        preorderQualificationMode: campaign.preorderQualificationMode,
        preorderTargetQuantity: campaign.preorderTargetQuantity,
        preorderCapacity: campaign.preorderCapacity,
        preorderDeadline: campaign.preorderDeadline,
        preorderTermsVersion: campaign.preorderTermsVersion,
        preorderTermsText: campaign.preorderTermsText,
        preorderPaymentInstructions: campaign.preorderPaymentInstructions,
        products: project.products,
        resume: resumeAdmission
      })
    : null;
  const summary = campaign
    ? summarizeLimitedPreorderOrders(orders, campaign.preorderQualificationMode, currentOffer?.hash ?? null)
    : { activeQuantity: 0, confirmedQuantity: 0, paidQuantity: 0, qualifiedQuantity: 0, refundPendingQuantity: 0 };
  const ownerBootstrapBlockedProjectStatuses: readonly CollaborationProjectStatus[] = [
    CollaborationProjectStatus.PREORDER_OPEN,
    CollaborationProjectStatus.PRODUCTION,
    CollaborationProjectStatus.QUALITY_CHECK,
    CollaborationProjectStatus.SHIPPING,
    CollaborationProjectStatus.COMPLETED,
    CollaborationProjectStatus.CANCELLED
  ];
  const legacyAdminCreatedProject = project.ownerUserId === null && project.createdBy?.role === UserRole.ADMIN;
  const ownerBootstrapAvailable = project.ownerUserId === null
    && (project.createdById === null || legacyAdminCreatedProject)
    && authorization?.status !== ProjectDesignAuthorizationStatus.ACCEPTED
    && project._count.orders === 0
    && (!campaign || campaign.preorderStatus === LimitedPreorderStatus.NOT_STARTED)
    && !ownerBootstrapBlockedProjectStatuses.includes(project.status);

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm disabled:cursor-not-allowed disabled:bg-black/[0.03]";
  const textarea = "min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm disabled:cursor-not-allowed disabled:bg-black/[0.03]";
  const projectHref = "/projects/" + (project.slug ?? project.id);
  const lifecycleFields = campaign ? (
    <>
      <input type="hidden" name="campaignId" value={campaign.id} />
      <input type="hidden" name="projectId" value={project.id} />
    </>
  ) : null;

  const productFields = (product?: (typeof project.products)[number]) => (
    <>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="projectId" value={project.id} />
      <input name="title" required maxLength={100} defaultValue={product?.title ?? project.work?.title ?? project.title} placeholder="商品标题" className={input} disabled={preparationLocked} />
      <select name="status" defaultValue={product?.status ?? ProjectProductStatus.DRAFT} className={input} disabled={preparationLocked}>
        {Object.values(ProjectProductStatus).map((status) => <option key={status} value={status}>{PROJECT_PRODUCT_STATUS_LABELS[status]}</option>)}
      </select>
      <input name="price" required type="number" min={1} step={1} defaultValue={product?.price ?? 0} placeholder="价格（分）" className={input} disabled={preparationLocked} />
      <select name="currency" defaultValue={product?.currency ?? "CNY"} className={input} disabled={preparationLocked}>
        <option value="CNY">CNY</option><option value="USD">USD</option><option value="EUR">EUR</option>
      </select>
      <input name="targetQuantity" type="number" min={1} defaultValue={product?.targetQuantity ?? ""} placeholder="商品目标量" className={input} disabled={preparationLocked} />
      <input name="preorderLimit" type="number" min={1} defaultValue={product?.preorderLimit ?? ""} placeholder="商品硬限量" className={input} disabled={preparationLocked} />
      <input name="imageStage" required minLength={2} maxLength={80} defaultValue={product?.imageStage ?? ""} placeholder="图片真实阶段，如：实物样衣照片" className={input} disabled={preparationLocked} />
      <label className="grid gap-1 text-xs font-semibold text-ink/45">预计发货日<input name="estimatedShipDate" type="date" defaultValue={dateInputValue(product?.estimatedShipDate)} className={input} disabled={preparationLocked} /></label>
      <input type="hidden" name="preorderDeadline" value={dateInputValue(campaign?.preorderDeadline)} />
      <textarea name="description" required minLength={20} maxLength={1000} defaultValue={product?.description ?? ""} placeholder="商品说明（至少 20 字）" className={textarea} disabled={preparationLocked} />
      <textarea name="materialDescription" required minLength={10} maxLength={500} defaultValue={product?.materialDescription ?? ""} placeholder="面料与工艺说明（至少 10 字）" className={textarea} disabled={preparationLocked} />
      <textarea name="careInstructions" required minLength={10} maxLength={500} defaultValue={product?.careInstructions ?? ""} placeholder="护理说明（至少 10 字）" className={textarea} disabled={preparationLocked} />
      <fieldset disabled={preparationLocked} className="contents">
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:bg-ink/25 md:col-span-2">
          {authorizationDecisionLocked ? "作者决定期间，最终资料已锁定" : lifecycleLocked ? "预售生命周期中，资料已锁定" : product ? "保存最终商品资料" : "创建商品草稿"}
        </button>
      </fieldset>
    </>
  );

  const reasonForm = (
    action: (formData: FormData) => Promise<void>,
    label: string,
    placeholder: string,
    options?: { danger?: boolean; disabled?: boolean; extra?: React.ReactNode }
  ) => (
    <form action={action} className={"grid gap-3 rounded-[8px] border p-4 " + (options?.danger ? "border-red-200" : "border-black/8")}>
      {lifecycleFields}
      <input name="reason" required minLength={4} placeholder={`${placeholder}（仅内部审计）`} className={input} />
      <input name="publicNotice" required minLength={4} maxLength={500} placeholder="消费者可见状态说明（请勿填写身份、风控或内部敏感信息）" className={input} />
      {options?.extra}
      <button disabled={options?.disabled} className={"h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-30 " + (options?.danger ? "bg-red-700 text-white" : "bg-ink text-white")}>{label}</button>
    </form>
  );

  const canSettle = campaign?.preorderStatus === LimitedPreorderStatus.OPEN || campaign?.preorderStatus === LimitedPreorderStatus.PAUSED;
  const cancellableStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.NOT_STARTED,
    LimitedPreorderStatus.OPEN,
    LimitedPreorderStatus.PAUSED,
    LimitedPreorderStatus.GOAL_REACHED,
    LimitedPreorderStatus.PRODUCTION
  ];
  const closableStatuses: readonly LimitedPreorderStatus[] = [
    LimitedPreorderStatus.FAILED,
    LimitedPreorderStatus.CANCELLED,
    LimitedPreorderStatus.PRODUCTION
  ];
  const canCancel = Boolean(campaign && cancellableStatuses.includes(campaign.preorderStatus));
  const canClose = Boolean(campaign && closableStatuses.includes(campaign.preorderStatus));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin · Limited Preorder V2.3 · 预订准备工作台</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">限量预售工作台</h1>
          <p className="mt-4 text-sm text-ink/58">{project.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/preorders/readiness" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">试点准入总览</Link>
          <Link href="/admin/presale-campaigns" className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">返回需求验证</Link>
          <Link href={projectHref} className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold">查看公开项目</Link>
        </div>
      </header>

      <section className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 text-sm md:grid-cols-4">
        <div><p className="text-xs font-semibold text-ink/40">设计授权</p><p className="mt-1 font-semibold">{PROJECT_AUTHORIZATION_LABELS[project.designerAuthorizationStatus]}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">项目阶段</p><p className="mt-1 font-semibold">{project.status}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">需求确认</p><p className="mt-1 font-semibold">{campaign ? `${confirmedDemandQuantity} / ${campaign.targetCount}` : "未关联活动"}</p></div>
        <div><p className="text-xs font-semibold text-ink/40">限量预售状态</p><p className="mt-1 font-semibold">{campaign ? LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus] : "未配置"}</p></div>
        <p className="text-xs leading-5 text-ink/48 md:col-span-4">V2.1 的未付款需求意向与 V2.3 的订单严格分开。商品资料保存不会自动创建订单、扣款、生产任务或收入。价格使用最小货币单位：CNY ¥199.00 填写 19900。</p>
      </section>

      <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink/40">REAL PROJECT OWNER · ONE-TIME BOOTSTRAP</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">真实项目负责人</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          后台只登记已经核实的真实负责人身份，不代替负责人发送邀请，不代替作品作者接受或拒绝，也不会自动开启预售。
        </p>
        {project.ownerUser ? (
          <div className="mt-4 rounded-[7px] bg-emerald-50 p-4 text-sm text-emerald-900">
            已登记：<span className="font-semibold">{project.ownerUser.nickname || "未命名用户"}</span>
            <span className="ml-2 text-xs opacity-70">({project.ownerUser.role} · {project.ownerUser.id})</span>
          </div>
        ) : ownerBootstrapAvailable ? (
          <>
            {legacyAdminCreatedProject ? (
              <p className="mt-4 rounded-[7px] bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                这是由系统管理员历史创建、但尚未登记真实负责人的项目。可在无授权、无订单且活动未开始时，仅补登记一次真实负责人；管理员创建记录仍保留在审计中。
              </p>
            ) : null}
            <form method="get" className="mt-4 flex flex-col gap-2 rounded-[7px] bg-black/[0.025] p-4 md:flex-row">
              <input
                name="ownerQuery"
                defaultValue={ownerQuery}
                maxLength={80}
                placeholder="按昵称、邮箱或完整用户 ID 搜索"
                className={input + " flex-1"}
              />
              <button className="h-10 rounded-full border border-black/10 px-5 text-sm font-semibold">搜索负责人账户</button>
            </form>
            <form action={assignCollaborationProjectOwnerFormAction} className="mt-3 grid gap-3 rounded-[7px] border border-black/8 p-4 md:grid-cols-2">
              <input type="hidden" name="projectId" value={project.id} />
              <select name="ownerUserId" required defaultValue="" className={input}>
                <option value="" disabled>
                  {ownerCandidates.length > 0 ? "选择已核实的真实负责人账户" : "没有匹配的可用账户，请调整搜索词"}
                </option>
                {ownerCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.nickname || "未命名用户"} · {candidate.persona || candidate.role} · {candidate.email || candidate.id}
                  </option>
                ))}
              </select>
              <input name="reason" required minLength={4} maxLength={500} placeholder="登记依据（仅内部审计，不填敏感信息）" className={input} />
              <p className="text-xs leading-5 text-ink/50 md:col-span-2">
                默认显示最早 50 个可用账户；搜索会在全部 ACTIVE 非管理员账户中匹配，不受默认列表范围限制。
              </p>
              <label className="flex items-start gap-2 text-xs leading-5 text-ink/60 md:col-span-2">
                <input type="checkbox" name="confirm" value="yes" required className="mt-1" />
                我已核实该账户确为项目真实负责人；本操作只登记身份，不创建或处理任何作品授权。
              </label>
              <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">一次性登记负责人</button>
            </form>
          </>
        ) : project.createdBy ? (
          <div className="mt-4 rounded-[7px] bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            该项目已有非管理员创建人 {project.createdBy.nickname || project.createdBy.id}。一次性补登记入口不会转移既有关系；如需转移负责人，应另行建立版本化授权流程。
          </div>
        ) : (
          <div className="mt-4 rounded-[7px] bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            当前项目不满足一次性补登记条件：必须没有负责人（或仅有历史管理员创建人）、没有任何授权记录或订单，且预售生命周期尚未开始。
          </div>
        )}
      </section>

      {!authorizationReady ? (
        <section className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-semibold text-amber-950">先完成最终开售资料，再由作者决定</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/75">先配置本期目标、限量、截止时间、完整条款、商品与 SKU，并把商品状态审核为“已通过”。真实项目负责人随后在个人授权中心发送这一版资料包；关联作品作者自行接受、拒绝或撤销。邀请发出后，价格、限量、交期、材质、护理和 SKU 会锁定，平台不能代替双方决定。</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/me/authorizations" className="inline-flex min-h-10 items-center rounded-full bg-amber-900 px-5 text-sm font-semibold text-white">前往授权中心</Link>
            <span className="text-xs leading-5 text-amber-900/65">若项目没有真实发起人，请先登记负责人。商品资料可先准备，但开售必须等待作者接受当前最终版本。</span>
          </div>
        </section>
      ) : null}

      {campaign && authorizationReady && (project.status !== CollaborationProjectStatus.PREORDER_READY || project.visibility !== "PUBLIC") ? (
        <form action={prepareLimitedPreorderProjectForOpening} className="mt-6 grid gap-3 rounded-[8px] border border-sky-200 bg-sky-50 p-5 md:grid-cols-2">
          {lifecycleFields}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-sky-950">完成项目预售准备</h2>
            <p className="mt-2 text-sm leading-6 text-sky-900/75">作者已接受当前最终资料包。此动作只把项目设为公开展示与 PREORDER_READY，不开放预售、不创建订单、不扣款。</p>
          </div>
          <input name="reason" required minLength={4} maxLength={500} placeholder="准备完成依据（仅内部审计）" className={input} />
          <label className="flex items-start gap-2 text-xs leading-5 text-sky-950">
            <input name="confirmProjectPreparation" type="checkbox" required className="mt-1" />
            我确认这一步不开放预售、不创建订单，只完成受控的公开与预售准备状态。
          </label>
          <button className="h-11 rounded-full bg-sky-900 px-5 text-sm font-semibold text-white md:col-span-2">设为公开并完成预售准备</button>
        </form>
      ) : null}

      {campaign ? (
        <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/35">Admission & lifecycle</p><h2 className="mt-2 text-2xl font-semibold text-ink">准入与活动生命周期</h2></div>
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus]}</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["活动订单意向", summary.activeQuantity],
              ["已确认", summary.confirmedQuantity],
              ["已付款", summary.paidQuantity],
              ["成团口径数量", summary.qualifiedQuantity],
              ["退款待处理", summary.refundPendingQuantity]
            ].map(([label, value]) => <div key={String(label)} className="rounded-[6px] bg-paper p-3"><p className="text-xs text-ink/40">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>

          {campaign.preorderStatus === LimitedPreorderStatus.NOT_STARTED ? (
            <form action={configureLimitedPreorderCampaign} className="mt-5 grid gap-3 rounded-[8px] bg-paper p-4 md:grid-cols-2">
              {lifecycleFields}
              <input name="preorderTargetQuantity" type="number" min={1} required defaultValue={campaign.preorderTargetQuantity ?? campaign.targetCount} placeholder="V2.3 成团目标" className={input} />
              <input name="preorderCapacity" type="number" min={1} required defaultValue={campaign.preorderCapacity ?? ""} placeholder="本期活动总限量" className={input} />
              <label className="grid gap-1 text-xs font-semibold text-ink/45">预售截止时间（UTC）<input name="preorderDeadline" type="datetime-local" required defaultValue={dateTimeInputValue(campaign.preorderDeadline)} className={input} /></label>
              <select name="preorderQualificationMode" defaultValue={campaign.preorderQualificationMode} className={input}>
                {Object.values(LimitedPreorderQualificationMode).map((mode) => <option key={mode} value={mode} disabled={mode === LimitedPreorderQualificationMode.PAID_ORDER}>{LIMITED_PREORDER_QUALIFICATION_LABELS[mode]}{mode === LimitedPreorderQualificationMode.PAID_ORDER ? "（待退款闭环）" : ""}</option>)}
              </select>
              <input name="preorderTermsVersion" required defaultValue={campaign.preorderTermsVersion} placeholder="条款版本" className={input} />
              <input name="reason" required minLength={4} placeholder="配置原因，例如：需求验证已达标" className={input} />
              <input name="publicNotice" required minLength={4} maxLength={500} defaultValue={campaign.preorderPublicNotice ?? "本期限量预售正在准备中，正式开放时间以页面状态为准。"} placeholder="消费者可见状态说明（请勿填写敏感信息）" className={input} />
              <textarea
                name="preorderTermsText"
                required
                minLength={40}
                maxLength={5000}
                defaultValue={campaign.preorderTermsText ?? `${LIMITED_PREORDER_NO_PAYMENT_NOTICE}\n\n本商品为限量预售，并非现货。活动须在截止前达到页面所示成团目标后才进入生产；未达标或取消时订单意向将关闭。预计发货时间为生产计划，并非到货承诺。`}
                placeholder="完整预售条款正文"
                className={textarea + " md:col-span-2"}
              />
              <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950 md:col-span-2">首期试点服务端强制不收款，不能填写转账、定金或任何付款指引。</div>
              <button disabled={authorizationDecisionLocked} className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold disabled:opacity-35 md:col-span-2">{authorizationDecisionLocked ? "作者决定期间，配置已锁定" : "保存并审计预售配置"}</button>
            </form>
          ) : null}

          <div className={"mt-5 rounded-[8px] border p-4 " + (admission?.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
            <p className="font-semibold">{admission?.ok ? "准入检查通过" : "准入检查未通过"}</p>
            {admission?.issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{admission.issues.map((item) => <li key={item.code + item.message}>{item.message}</li>)}</ul> : <p className="mt-2 text-sm leading-6">授权、需求、商品、SKU、限量、截止时间与条款版本均已满足当前操作条件。</p>}
          </div>

          <div className="mt-5 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
            <p className="font-semibold">法律与付款边界</p>
            <p className="mt-1">限量预售不等于现货。页面必须展示截止时间、成团口径、预计发货时间与失败处理。真实支付未开启时不得使用“已筹资”或“已付款”表述；失败或取消后的已付款订单只能进入退款待处理。</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {campaign.preorderStatus === LimitedPreorderStatus.NOT_STARTED ? reasonForm(
              openLimitedPreorderCampaign,
              preorderEnabled ? "正式开放限量预售" : "V2.3 功能开关未开启",
              "开售原因",
              {
                disabled: !preorderEnabled || !admission?.ok,
                extra: <label className="flex items-start gap-2 text-xs leading-5"><input name="confirmPreorderNotice" type="checkbox" required className="mt-1" />已确认消费者页面明确展示“预售不等于现货”及当前条款版本。</label>
              }
            ) : null}
            {campaign.preorderStatus === LimitedPreorderStatus.OPEN ? reasonForm(pauseLimitedPreorderCampaign, "暂停接单", "暂停原因") : null}
            {campaign.preorderStatus === LimitedPreorderStatus.PAUSED ? reasonForm(resumeLimitedPreorderCampaign, "恢复接单", "恢复原因", { disabled: !preorderEnabled || !admission?.ok }) : null}
            {canSettle ? reasonForm(settleLimitedPreorderCampaign, "按成团口径结算", "结算判断依据") : null}
            {campaign.preorderStatus === LimitedPreorderStatus.GOAL_REACHED ? reasonForm(
              startLimitedPreorderProduction,
              "核验承接后进入生产",
              "进入生产依据",
              {
                extra: (
                  <>
                    <input name="productionEvidenceRef" required minLength={4} maxLength={200} placeholder="生产承接证据编号（外部协议、工单或确认记录编号）" className={input} />
                    <textarea name="productionCommitmentSummary" required minLength={20} maxLength={500} placeholder="最小摘要：真实生产责任方、MOQ、产能、交付承诺与核验结论；不要填写完整联系方式" className={textarea} />
                    <label className="flex items-start gap-2 text-xs leading-5"><input name="confirmProductionCommitment" type="checkbox" required className="mt-1" />我已核实真实生产责任方愿意承接，并确认 MOQ、产能、交付与质量责任；需求达标本身不等于可生产。</label>
                  </>
                )
              }
            ) : null}
            {canCancel ? reasonForm(cancelLimitedPreorderCampaign, "取消本期预售", "取消原因（必填并写入审计）", { danger: true }) : null}
            {canClose ? reasonForm(closeLimitedPreorderCampaign, "检查订单后结束归档", "结束归档原因") : null}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">该项目尚未关联 V2.1 需求验证活动。请先在“预售活动管理”中保存项目关联，再配置 V2.3。</section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">新增商品草稿</h2>
        <form action={saveProjectProduct} className="mt-3 grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">{productFields()}</form>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-ink">商品与 SKU 限量</h2>
        {project.products.length ? project.products.map((product) => {
          const enabledSkuCapacity = product.skus.filter((sku) => sku.enabled).reduce((sum, sku) => sum + (sku.capacity ?? 0), 0);
          return (
            <article key={product.id} className="rounded-[8px] border border-black/8 bg-white p-5">
              <form action={saveProjectProduct} className="grid gap-3 md:grid-cols-2">
                <p className="text-xs font-semibold text-ink/45 md:col-span-2">当前：{PROJECT_PRODUCT_STATUS_LABELS[product.status]} · {formatMoneyCents(product.price, product.currency)} · 商品硬限量 {product.preorderLimit ?? "未设"} · 启用 SKU 容量 {enabledSkuCapacity}</p>
                {productFields(product)}
              </form>
              <div className="mt-5 border-t border-black/8 pt-5">
                <h3 className="font-semibold">SKU（尺码 / 颜色 / 容量）</h3>
                <div className="mt-3 space-y-3">
                  {product.skus.map((sku) => (
                    <form key={sku.id} action={saveProjectSku} className="grid gap-2 rounded-[6px] bg-paper p-3 md:grid-cols-6">
                      <input type="hidden" name="id" value={sku.id} /><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="productId" value={product.id} />
                      <input name="size" required defaultValue={sku.size} placeholder="尺码" className={input} disabled={preparationLocked} />
                      <input name="color" required defaultValue={sku.color} placeholder="颜色" className={input} disabled={preparationLocked} />
                      <input name="skuCode" defaultValue={sku.skuCode ?? ""} placeholder="SKU 编码" className={input} disabled={preparationLocked} />
                      <input name="capacity" type="number" min={1} defaultValue={sku.capacity ?? ""} placeholder="容量" className={input} disabled={preparationLocked} />
                      <input name="priceOverride" type="number" min={1} defaultValue={sku.priceOverride ?? ""} placeholder="覆盖价格（分，可留空）" className={input} disabled={preparationLocked} />
                      <label className="flex items-center gap-2 text-xs"><input name="enabled" type="checkbox" defaultChecked={sku.enabled} disabled={preparationLocked} />启用</label>
                      <button disabled={preparationLocked} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold disabled:opacity-35 md:col-span-6">保存 SKU</button>
                    </form>
                  ))}
                  <form action={saveProjectSku} className="grid gap-2 rounded-[6px] border border-dashed border-black/15 p-3 md:grid-cols-6">
                    <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="productId" value={product.id} />
                    <input name="size" required placeholder="尺码" className={input} disabled={preparationLocked} />
                    <input name="color" required placeholder="颜色" className={input} disabled={preparationLocked} />
                    <input name="skuCode" placeholder="SKU 编码" className={input} disabled={preparationLocked} />
                    <input name="capacity" type="number" min={1} required placeholder="容量" className={input} disabled={preparationLocked} />
                    <input name="priceOverride" type="number" min={1} placeholder="覆盖价格（分，可留空）" className={input} disabled={preparationLocked} />
                    <label className="flex items-center gap-2 text-xs"><input name="enabled" type="checkbox" defaultChecked disabled={preparationLocked} />启用</label>
                    <button disabled={preparationLocked} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:bg-ink/25 md:col-span-6">新增 SKU</button>
                  </form>
                </div>
              </div>
            </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">还没有商品草稿。先完成价格、目标量、硬限量、说明、发货预期和 SKU 容量，再进入审核与开售。</div>}
      </section>
    </div>
  );
}
