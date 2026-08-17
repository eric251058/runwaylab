"use server";

import { revalidatePath } from "next/cache";
import {
  CollaborationProjectStatus,
  CommerceAggregateType,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  PresaleCampaignIntentStatus,
  Prisma,
  ProjectOrderPaymentStatus,
  ProjectOrderFulfillmentStatus,
  ProjectOrderStatus,
  ProjectProductStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { enumValue, optionalText, requiredText } from "@/lib/commercial-collaboration";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/features";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  assertLifecycleReason,
  assertPublicPreorderNotice,
  canTransitionLimitedPreorder,
  evaluateLimitedPreorderAdmission,
  evaluateLimitedPreorderDecision,
  hasCurrentLimitedPreorderAuthorization,
  planFailedOrderDisposition,
  planGoalReachedOrderDisposition,
  planProductionOrderDisposition,
  summarizeLimitedPreorderOrders,
  type OrderDisposition
} from "@/lib/projects/preorder-lifecycle";
import { isPublicQualityWork } from "@/lib/works/rules";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  return user;
}

function requiredPositiveInt(value: FormDataEntryValue | null, label: string) {
  const raw = optionalText(value);
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_000_000) throw new Error(`${label}必须是 1 至 1000000 的整数`);
  return parsed;
}

function optionalUtcDateTime(value: FormDataEntryValue | null) {
  const raw = optionalText(value);
  if (!raw) return null;
  const parsed = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("预售截止时间填写有误");
  return parsed;
}

async function runLifecycleTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("预售状态并发冲突，请刷新后重试");
}

function revalidateLifecycle(projectId: string) {
  revalidatePath("/admin/presale-campaigns");
  revalidatePath(`/admin/projects/${projectId}/preorder`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/me/orders");
  revalidatePath("/presale");
}

async function loadLifecycleContext(tx: Prisma.TransactionClient, campaignId: string, projectId: string) {
  const [project, linkedProjectCount] = await Promise.all([
    tx.collaborationProject.findUnique({
      where: { id: projectId },
      include: {
        work: {
          select: {
            userId: true,
            title: true,
            description: true,
            reviewStatus: true,
            contentStatus: true,
            visibility: true,
            images: { select: { imageUrl: true } }
          }
        },
        presaleCampaign: {
          include: {
            intents: { select: { status: true, quantity: true } }
          }
        },
        designAuthorizations: { select: { status: true, preorderCampaignId: true, workId: true, designerUserId: true, ownerUserId: true, termsVersion: true }, take: 1 },
        products: { include: { skus: true }, orderBy: { createdAt: "asc" } },
        orders: {
          where: { preorderCampaignId: campaignId },
          select: {
            id: true,
            quantity: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    }),
    tx.collaborationProject.count({ where: { presaleCampaignId: campaignId } })
  ]);

  if (!project || !project.presaleCampaign || project.presaleCampaign.id !== campaignId) {
    throw new Error("限量预售活动与协作项目未正确关联");
  }
  return { project, campaign: project.presaleCampaign, linkedProjectCount };
}

function admissionForContext(
  context: Awaited<ReturnType<typeof loadLifecycleContext>>,
  { now, resume = false }: { now: Date; resume?: boolean }
) {
  const confirmedDemandQuantity = context.campaign.intents
    .filter((intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED)
    .reduce((sum, intent) => sum + intent.quantity, 0);

  return evaluateLimitedPreorderAdmission({
    campaignId: context.campaign.id,
    linkedProjectCount: context.linkedProjectCount,
    campaignWorkId: context.campaign.workId,
    projectWorkId: context.project.workId,
    workOwnerUserId: context.project.work?.userId ?? null,
    projectOwnerUserId: context.project.ownerUserId ?? context.project.createdById,
    publicWorkReady: Boolean(context.project.work && isPublicQualityWork(context.project.work)),
    projectStatus: context.project.status,
    projectVisibility: context.project.visibility,
    projectAuthorizationStatus: context.project.designerAuthorizationStatus,
    authorizationRecordStatus: context.project.designAuthorizations[0]?.status ?? null,
    authorizationPreorderCampaignId: context.project.designAuthorizations[0]?.preorderCampaignId ?? null,
    authorizationRecordWorkId: context.project.designAuthorizations[0]?.workId ?? null,
    authorizationDesignerUserId: context.project.designAuthorizations[0]?.designerUserId ?? null,
    authorizationOwnerUserId: context.project.designAuthorizations[0]?.ownerUserId ?? null,
    authorizationTermsVersion: context.project.designAuthorizations[0]?.termsVersion ?? null,
    demandTargetQuantity: context.campaign.targetCount,
    confirmedDemandQuantity,
    demandCampaignStatus: context.campaign.status,
    preorderStatus: context.campaign.preorderStatus,
    preorderQualificationMode: context.campaign.preorderQualificationMode,
    preorderTargetQuantity: context.campaign.preorderTargetQuantity,
    preorderCapacity: context.campaign.preorderCapacity,
    preorderDeadline: context.campaign.preorderDeadline,
    preorderTermsVersion: context.campaign.preorderTermsVersion,
    preorderTermsText: context.campaign.preorderTermsText,
    preorderPaymentInstructions: context.campaign.preorderPaymentInstructions,
    products: context.project.products,
    now,
    resume
  });
}

async function recordCampaignTransition(
  tx: Prisma.TransactionClient,
  {
    campaignId,
    actorId,
    fromState,
    toState,
    reason,
    metadata
  }: {
    campaignId: string;
    actorId: string;
    fromState: LimitedPreorderStatus;
    toState: LimitedPreorderStatus;
    reason: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.commerceStateEvent.create({
    data: {
      aggregateType: CommerceAggregateType.CAMPAIGN,
      aggregateId: campaignId,
      fromState,
      toState,
      actorId,
      reason,
      metadata
    }
  });
}

async function recordLifecycleAdminLog(
  tx: Prisma.TransactionClient,
  {
    adminId,
    action,
    campaignId,
    projectId,
    reason,
    detail
  }: {
    adminId: string;
    action: string;
    campaignId: string;
    projectId: string;
    reason: string;
    detail?: Prisma.InputJsonValue;
  }
) {
  await tx.adminLog.create({
    data: {
      adminId,
      action,
      targetType: "PresaleCampaign",
      targetId: campaignId,
      detail: { projectId, reason, ...(detail && typeof detail === "object" && !Array.isArray(detail) ? detail : { metadata: detail }) }
    }
  });
}

async function applyOrderDisposition(
  tx: Prisma.TransactionClient,
  {
    order,
    disposition,
    campaignId,
    actorId,
    reason,
    now
  }: {
    order: Awaited<ReturnType<typeof loadLifecycleContext>>["project"]["orders"][number];
    disposition: OrderDisposition;
    campaignId: string;
    actorId: string;
    reason: string;
    now: Date;
  }
) {
  if (disposition === "NOOP") return;
  if (disposition === "MANUAL_REVIEW") throw new Error(`订单 ${order.id} 状态异常，必须先人工处理，活动状态未改变。`);

  const toState = disposition === "CANCEL"
    ? ProjectOrderStatus.CANCELLED
    : disposition === "REFUND_PENDING"
      ? ProjectOrderStatus.REFUND_PENDING
      : disposition === "PRODUCTION"
        ? ProjectOrderStatus.PRODUCTION
        : ProjectOrderStatus.CONFIRMED;
  const fulfillmentStatus = disposition === "PRODUCTION" ? ProjectOrderFulfillmentStatus.PRODUCTION : order.fulfillmentStatus;
  const changed = await tx.projectOrder.updateMany({
    where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus },
    data: {
      status: toState,
      fulfillmentStatus,
      cancelledAt: disposition === "CANCEL" ? now : undefined,
      cancellationReason: disposition === "CANCEL" ? reason : undefined
    }
  });
  if (changed.count !== 1) throw new Error(`订单 ${order.id} 状态已变化，请刷新后重试`);
  await tx.commerceStateEvent.create({
    data: {
      aggregateType: CommerceAggregateType.ORDER,
      aggregateId: order.id,
      fromState: order.status,
      toState,
      actorId,
      reason,
      metadata: {
        campaignId,
        disposition,
        paymentStatus: order.paymentStatus,
        oldFulfillmentStatus: order.fulfillmentStatus,
        newFulfillmentStatus: fulfillmentStatus
      }
    }
  });
}

function assertNoManualReview(
  orders: Awaited<ReturnType<typeof loadLifecycleContext>>["project"]["orders"],
  resolver: (order: Awaited<ReturnType<typeof loadLifecycleContext>>["project"]["orders"][number]) => OrderDisposition
) {
  const blocked = orders.filter((order) => resolver(order) === "MANUAL_REVIEW");
  if (blocked.length) throw new Error(`存在 ${blocked.length} 笔异常订单（${blocked.map((order) => order.id).join("、")}），请先人工处理。`);
}

export async function configureLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));
  const preorderTargetQuantity = requiredPositiveInt(formData.get("preorderTargetQuantity"), "成团目标");
  const preorderCapacity = requiredPositiveInt(formData.get("preorderCapacity"), "活动限量");
  if (preorderTargetQuantity > preorderCapacity) throw new Error("成团目标不能大于活动限量");
  const preorderDeadline = optionalUtcDateTime(formData.get("preorderDeadline"));
  if (!preorderDeadline || preorderDeadline <= new Date()) throw new Error("预售截止时间必须晚于当前时间");
  const preorderTermsVersion = requiredText(formData.get("preorderTermsVersion"), "条款版本").slice(0, 80);
  const preorderTermsText = requiredText(formData.get("preorderTermsText"), "预售条款正文").slice(0, 5000);
  if (preorderTermsText.length < 40) throw new Error("预售条款正文至少需要 40 个字符");
  const preorderQualificationMode = enumValue(
    formData.get("preorderQualificationMode"),
    Object.values(LimitedPreorderQualificationMode),
    LimitedPreorderQualificationMode.CONFIRMED_ORDER
  );
  const preorderPaymentInstructions = optionalText(formData.get("preorderPaymentInstructions"))?.slice(0, 2000) ?? null;
  if (preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER && (!preorderPaymentInstructions || preorderPaymentInstructions.length < 20)) {
    throw new Error("按付款成团时必须填写至少 20 个字符的付款和人工确认指引");
  }
  if (preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER) {
    throw new Error("本批次仅开放人工确认的真实订单意向；按付款成团必须等待真实退款记录闭环完成后再启用");
  }

  await runLifecycleTransaction(async (tx) => {
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED) throw new Error("限量预售开始后不能修改目标、限量、截止时间或条款版本");
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: LimitedPreorderStatus.NOT_STARTED },
      data: { preorderTargetQuantity, preorderCapacity, preorderDeadline, preorderTermsVersion, preorderTermsText, preorderPaymentInstructions, preorderQualificationMode, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("预售配置已变化，请刷新后重试");
    await recordLifecycleAdminLog(tx, {
      adminId: admin.id,
      action: "LIMITED_PREORDER_CONFIGURE",
      campaignId,
      projectId,
      reason,
      detail: { preorderTargetQuantity, preorderCapacity, preorderDeadline: preorderDeadline.toISOString(), preorderTermsVersion, preorderTermsText, preorderPaymentInstructions, preorderQualificationMode, publicNotice }
    });
  });

  revalidateLifecycle(projectId);
}

export async function openLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) throw new Error("Limited Preorder V2.3 功能开关未开启");
  if (formData.get("confirmPreorderNotice") !== "on") throw new Error("必须确认已展示“预售不等于现货”提示并锁定条款版本");
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));
  const flags = await getFeatureFlags();

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.OPEN) return;
    if (context.campaign.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER) {
      throw new Error(`按付款成团尚未开放：当前批次没有可核验的退款记录闭环（人工支付试点 ${flags["feature.manual_payment_pilot"] ? "已开启" : "未开启"}；真实支付 ${flags["feature.live_payment"] ? "已配置但未接入本流程" : "未开启"}）`);
    }
    const admission = admissionForContext(context, { now });
    if (!admission.ok) throw new Error(`暂不可开放限量预售：${admission.issues.map((item) => item.message).join("；")}`);
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.OPEN)) throw new Error("活动状态不允许开放");

    const campaignChanged = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: LimitedPreorderStatus.NOT_STARTED },
      data: {
        preorderStatus: LimitedPreorderStatus.OPEN,
        preorderOpenedAt: now,
        preorderPausedAt: null,
        preorderClosedAt: null,
        preorderDecisionReason: reason,
        preorderPublicNotice: publicNotice
      }
    });
    if (campaignChanged.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    const projectChanged = await tx.collaborationProject.updateMany({
      where: { id: projectId, status: CollaborationProjectStatus.PREORDER_READY },
      data: { status: CollaborationProjectStatus.PREORDER_OPEN }
    });
    if (projectChanged.count !== 1) throw new Error("项目状态已变化，请刷新后重试");
    const productsChanged = await tx.projectProduct.updateMany({
      where: { id: { in: admission.launchProductIds }, projectId, status: ProjectProductStatus.APPROVED },
      data: { status: ProjectProductStatus.PREORDER_OPEN, preorderDeadline: context.campaign.preorderDeadline, preorderCampaignId: campaignId }
    });
    if (productsChanged.count !== admission.launchProductIds.length) throw new Error("商品状态已变化，请刷新后重试");

    const metadata = {
      projectId,
      productIds: admission.launchProductIds,
      qualificationMode: context.campaign.preorderQualificationMode,
      targetQuantity: context.campaign.preorderTargetQuantity,
      capacity: context.campaign.preorderCapacity,
      deadline: context.campaign.preorderDeadline?.toISOString(),
      termsVersion: context.campaign.preorderTermsVersion
    };
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState: LimitedPreorderStatus.NOT_STARTED, toState: LimitedPreorderStatus.OPEN, reason, metadata });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_OPEN", campaignId, projectId, reason, detail: metadata });
  });

  revalidateLifecycle(projectId);
}

export async function pauseLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.PAUSED) return;
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.PAUSED)) throw new Error("活动状态不允许暂停");
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: LimitedPreorderStatus.OPEN },
      data: { preorderStatus: LimitedPreorderStatus.PAUSED, preorderPausedAt: new Date(), preorderDecisionReason: reason, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    await tx.collaborationProject.updateMany({ where: { id: projectId, status: CollaborationProjectStatus.PREORDER_OPEN }, data: { status: CollaborationProjectStatus.PREORDER_READY } });
    await tx.projectProduct.updateMany({ where: { projectId, preorderCampaignId: campaignId, status: ProjectProductStatus.PREORDER_OPEN }, data: { status: ProjectProductStatus.PAUSED } });
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState: LimitedPreorderStatus.OPEN, toState: LimitedPreorderStatus.PAUSED, reason, metadata: { projectId } });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_PAUSE", campaignId, projectId, reason });
  });

  revalidateLifecycle(projectId);
}

export async function resumeLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) throw new Error("Limited Preorder V2.3 功能开关未开启");
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.OPEN) return;
    if (context.campaign.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER) {
      throw new Error("按付款成团尚未具备真实退款记录闭环，不能恢复接单");
    }
    const admission = admissionForContext(context, { now, resume: true });
    if (!admission.ok) throw new Error(`暂不可恢复限量预售：${admission.issues.map((item) => item.message).join("；")}`);
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.OPEN)) throw new Error("活动状态不允许恢复开放");
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: LimitedPreorderStatus.PAUSED },
      data: { preorderStatus: LimitedPreorderStatus.OPEN, preorderPausedAt: null, preorderDecisionReason: reason, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    const projectChanged = await tx.collaborationProject.updateMany({ where: { id: projectId, status: CollaborationProjectStatus.PREORDER_READY }, data: { status: CollaborationProjectStatus.PREORDER_OPEN } });
    if (projectChanged.count !== 1) throw new Error("项目状态已变化，请刷新后重试");
    const productsChanged = await tx.projectProduct.updateMany({
      where: { id: { in: admission.launchProductIds }, projectId, preorderCampaignId: campaignId, status: ProjectProductStatus.PAUSED },
      data: { status: ProjectProductStatus.PREORDER_OPEN }
    });
    if (productsChanged.count !== admission.launchProductIds.length) throw new Error("商品状态已变化，请刷新后重试");
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState: LimitedPreorderStatus.PAUSED, toState: LimitedPreorderStatus.OPEN, reason, metadata: { projectId, productIds: admission.launchProductIds } });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_RESUME", campaignId, projectId, reason });
  });

  revalidateLifecycle(projectId);
}

export async function settleLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.GOAL_REACHED || context.campaign.preorderStatus === LimitedPreorderStatus.FAILED) return;
    if (context.campaign.preorderStatus !== LimitedPreorderStatus.OPEN && context.campaign.preorderStatus !== LimitedPreorderStatus.PAUSED) throw new Error("只有开放或暂停的活动可以结算");
    if (!context.campaign.preorderTargetQuantity || !context.campaign.preorderDeadline) throw new Error("预售目标或截止时间缺失");
    const summary = summarizeLimitedPreorderOrders(context.project.orders, context.campaign.preorderQualificationMode);
    const decision = evaluateLimitedPreorderDecision({
      qualifiedQuantity: summary.qualifiedQuantity,
      targetQuantity: context.campaign.preorderTargetQuantity,
      deadline: context.campaign.preorderDeadline,
      now
    });
    if (!decision) throw new Error("活动尚未达标且未到截止时间，不能提前判定失败；如需停止请使用取消");
    const resolver = decision === LimitedPreorderStatus.GOAL_REACHED
      ? (order: (typeof context.project.orders)[number]) => planGoalReachedOrderDisposition(order, context.campaign.preorderQualificationMode)
      : planFailedOrderDisposition;
    assertNoManualReview(context.project.orders, resolver);

    const fromState = context.campaign.preorderStatus;
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: fromState },
      data: {
        preorderStatus: decision,
        preorderDecidedAt: now,
        preorderClosedAt: now,
        preorderDecisionReason: reason,
        preorderPublicNotice: publicNotice
      }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    await tx.collaborationProject.updateMany({
      where: { id: projectId, status: { in: [CollaborationProjectStatus.PREORDER_OPEN, CollaborationProjectStatus.PREORDER_READY] } },
      data: { status: CollaborationProjectStatus.PREORDER_READY }
    });
    await tx.projectProduct.updateMany({
      where: { projectId, preorderCampaignId: campaignId, status: { in: [ProjectProductStatus.PREORDER_OPEN, ProjectProductStatus.PAUSED] } },
      data: { status: ProjectProductStatus.PAUSED }
    });
    for (const order of context.project.orders) {
      await applyOrderDisposition(tx, { order, disposition: resolver(order), campaignId, actorId: admin.id, reason, now });
    }
    const metadata = { projectId, qualificationMode: context.campaign.preorderQualificationMode, targetQuantity: context.campaign.preorderTargetQuantity, ...summary };
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState, toState: decision, reason, metadata });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: decision === LimitedPreorderStatus.GOAL_REACHED ? "LIMITED_PREORDER_GOAL_REACHED" : "LIMITED_PREORDER_FAILED", campaignId, projectId, reason, detail: metadata });
  });

  revalidateLifecycle(projectId);
}

export async function cancelLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.CANCELLED) return;
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.CANCELLED)) throw new Error("活动状态不允许取消");
    assertNoManualReview(context.project.orders, planFailedOrderDisposition);
    const fromState = context.campaign.preorderStatus;
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: fromState },
      data: { preorderStatus: LimitedPreorderStatus.CANCELLED, preorderDecidedAt: now, preorderClosedAt: now, preorderDecisionReason: reason, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    await tx.collaborationProject.updateMany({
      where: {
        id: projectId,
        status: { in: [CollaborationProjectStatus.PREORDER_OPEN, CollaborationProjectStatus.PREORDER_READY, CollaborationProjectStatus.PRODUCTION] }
      },
      data: { status: CollaborationProjectStatus.PREORDER_READY }
    });
    await tx.projectProduct.updateMany({ where: { projectId, preorderCampaignId: campaignId, status: ProjectProductStatus.PREORDER_OPEN }, data: { status: ProjectProductStatus.PAUSED } });
    for (const order of context.project.orders) {
      await applyOrderDisposition(tx, { order, disposition: planFailedOrderDisposition(order), campaignId, actorId: admin.id, reason, now });
    }
    const summary = summarizeLimitedPreorderOrders(context.project.orders, context.campaign.preorderQualificationMode);
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState, toState: LimitedPreorderStatus.CANCELLED, reason, metadata: { projectId, ...summary } });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_CANCEL", campaignId, projectId, reason, detail: summary });
  });

  revalidateLifecycle(projectId);
}

export async function startLimitedPreorderProduction(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.PRODUCTION) return;
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.PRODUCTION)) throw new Error("只有已达标活动可以进入生产");
    if (!context.project.work || !isPublicQualityWork(context.project.work)) {
      throw new Error("关联作品已下架或不再满足公开质量门槛，不能进入生产；请先核查版权与内容风险并暂停或取消活动");
    }
    const authorization = context.project.designAuthorizations[0] ?? null;
    if (!hasCurrentLimitedPreorderAuthorization({
      campaignId: context.campaign.id,
      campaignWorkId: context.campaign.workId,
      projectWorkId: context.project.workId,
      workOwnerUserId: context.project.work.userId,
      projectOwnerUserId: context.project.ownerUserId ?? context.project.createdById,
      projectAuthorizationStatus: context.project.designerAuthorizationStatus,
      authorizationRecordStatus: authorization?.status ?? null,
      authorizationPreorderCampaignId: authorization?.preorderCampaignId ?? null,
      authorizationRecordWorkId: authorization?.workId ?? null,
      authorizationDesignerUserId: authorization?.designerUserId ?? null,
      authorizationOwnerUserId: authorization?.ownerUserId ?? null,
      authorizationTermsVersion: authorization?.termsVersion ?? null
    })) {
      throw new Error("当前标准设计授权已失效或与项目、作品、作者、负责人不一致，不能进入生产；请先停止活动并重新取得作者授权");
    }
    const summary = summarizeLimitedPreorderOrders(context.project.orders, context.campaign.preorderQualificationMode);
    if (!context.campaign.preorderTargetQuantity || summary.qualifiedQuantity < context.campaign.preorderTargetQuantity) throw new Error("合格订单数量已低于成团目标，不能进入生产");
    const dispositions = context.project.orders.map((order) => planProductionOrderDisposition(order, context.campaign.preorderQualificationMode));
    if (!dispositions.includes("PRODUCTION")) throw new Error("没有可进入生产的合格订单");

    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: LimitedPreorderStatus.GOAL_REACHED },
      data: { preorderStatus: LimitedPreorderStatus.PRODUCTION, preorderProductionStartedAt: now, preorderDecisionReason: reason, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    const projectChanged = await tx.collaborationProject.updateMany({ where: { id: projectId, status: CollaborationProjectStatus.PREORDER_READY }, data: { status: CollaborationProjectStatus.PRODUCTION } });
    if (projectChanged.count !== 1) throw new Error("项目状态已变化，请刷新后重试");
    for (let index = 0; index < context.project.orders.length; index += 1) {
      await applyOrderDisposition(tx, { order: context.project.orders[index], disposition: dispositions[index], campaignId, actorId: admin.id, reason, now });
    }
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState: LimitedPreorderStatus.GOAL_REACHED, toState: LimitedPreorderStatus.PRODUCTION, reason, metadata: { projectId, ...summary } });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_START_PRODUCTION", campaignId, projectId, reason, detail: summary });
  });

  revalidateLifecycle(projectId);
}

export async function closeLimitedPreorderCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const projectId = requiredText(formData.get("projectId"), "协作项目");
  const reason = assertLifecycleReason(optionalText(formData.get("reason")));
  const publicNotice = assertPublicPreorderNotice(optionalText(formData.get("publicNotice")));

  await runLifecycleTransaction(async (tx) => {
    const now = new Date();
    const context = await loadLifecycleContext(tx, campaignId, projectId);
    if (context.campaign.preorderStatus === LimitedPreorderStatus.CLOSED) return;
    if (!canTransitionLimitedPreorder(context.campaign.preorderStatus, LimitedPreorderStatus.CLOSED)) throw new Error("当前活动尚不能结束归档");
    const summary = summarizeLimitedPreorderOrders(context.project.orders, context.campaign.preorderQualificationMode);
    if (summary.refundPendingQuantity > 0) throw new Error("仍有退款待处理订单，不能结束活动");
    if (
      ([LimitedPreorderStatus.FAILED, LimitedPreorderStatus.CANCELLED] as readonly LimitedPreorderStatus[]).includes(context.campaign.preorderStatus)
      && context.project.orders.some((order) => (
        order.paymentStatus === ProjectOrderPaymentStatus.PAID
        || order.paymentStatus === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
      ))
    ) {
      throw new Error("仍有已付款或部分退款的资金义务，必须以成功退款记录结清后才能结束活动");
    }
    if (context.campaign.preorderStatus === LimitedPreorderStatus.PRODUCTION) {
      const terminalStatuses: readonly ProjectOrderStatus[] = [ProjectOrderStatus.COMPLETED, ProjectOrderStatus.CANCELLED, ProjectOrderStatus.REFUNDED];
      const unfinished = context.project.orders.filter((order) => !terminalStatuses.includes(order.status));
      if (unfinished.length) throw new Error(`仍有 ${unfinished.length} 笔订单未完成，不能结束活动`);
    }
    const fromState = context.campaign.preorderStatus;
    const changed = await tx.presaleCampaign.updateMany({
      where: { id: campaignId, preorderStatus: fromState },
      data: { preorderStatus: LimitedPreorderStatus.CLOSED, preorderClosedAt: now, preorderDecisionReason: reason, preorderPublicNotice: publicNotice }
    });
    if (changed.count !== 1) throw new Error("活动状态已变化，请刷新后重试");
    if (fromState === LimitedPreorderStatus.PRODUCTION) {
      await tx.collaborationProject.updateMany({ where: { id: projectId, status: CollaborationProjectStatus.PRODUCTION }, data: { status: CollaborationProjectStatus.COMPLETED } });
    }
    await recordCampaignTransition(tx, { campaignId, actorId: admin.id, fromState, toState: LimitedPreorderStatus.CLOSED, reason, metadata: { projectId, ...summary } });
    await recordLifecycleAdminLog(tx, { adminId: admin.id, action: "LIMITED_PREORDER_CLOSE", campaignId, projectId, reason, detail: summary });
  });

  revalidateLifecycle(projectId);
}
