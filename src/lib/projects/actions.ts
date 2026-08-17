"use server";

import { revalidatePath } from "next/cache";
import {
  CommerceRefundStatus,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  CollaborationProjectStatus,
  Prisma,
  ProjectDesignAuthorizationStatus,
  ProjectIssueStatus,
  ProjectOrderFulfillmentStatus,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/features";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { projectDesignAuthorizationPolicy } from "@/lib/projects/design-authorization-policy";
import {
  canDesignerRespondToAuthorization,
  canManageProject,
  canRequestProjectDesignAuthorization,
  canTransitionFulfillmentStatus,
  canTransitionOrderStatus,
  nextAuthorizationRequestData,
  ownerCannotRespondToAuthorization,
  resolveManualPaymentStatusUpdate
} from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function issueStatus(value: FormDataEntryValue | null) {
  return typeof value === "string" && Object.values(ProjectIssueStatus).includes(value as ProjectIssueStatus)
    ? (value as ProjectIssueStatus)
    : ProjectIssueStatus.OPEN;
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

function authorizationResponse(value: FormDataEntryValue | null) {
  if (value === ProjectDesignAuthorizationStatus.ACCEPTED || value === ProjectDesignAuthorizationStatus.REJECTED) {
    return value;
  }
  throw new Error("授权状态不正确");
}

async function runProjectAuthorizationTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("设计授权状态并发冲突，请刷新后重试");
}

export async function updateProjectIssue(formData: FormData) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) throw new Error("项目市场功能尚未开放");
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");

  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("问题 ID 缺失");

  const status = issueStatus(formData.get("status"));
  await prisma.projectIssue.update({
    where: { id },
    data: {
      status,
      adminNote: optionalText(formData.get("adminNote")),
      resolvedAt: status === ProjectIssueStatus.RESOLVED ? new Date() : null
    }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "PROJECT_ISSUE_UPDATE",
      targetType: "ProjectIssue",
      targetId: id,
      detail: { status }
    }
  });

  revalidatePath("/admin/project-issues");
}

export async function requestProjectDesignAuthorization(formData: FormData) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) throw new Error("项目市场功能尚未开放");
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const projectId = requiredText(formData.get("projectId"), "项目 ID");
  const notification = await runProjectAuthorizationTransaction(async (tx) => {
    const project = await tx.collaborationProject.findUnique({
      where: { id: projectId },
      include: {
        work: { select: { id: true, userId: true, title: true } },
        presaleCampaign: { select: { id: true, preorderStatus: true } }
      }
    });
    if (!project || !canRequestProjectDesignAuthorization(user, project)) throw new Error("只有项目发起人可以邀请作品作者授权");
    if (!project.workId || !project.work) throw new Error("该项目尚未关联公开作品，不能申请设计授权");
    const existingAuthorization = await tx.projectDesignAuthorization.findUnique({
      where: { projectId },
      select: {
        id: true,
        status: true,
        preorderCampaignId: true,
        termsVersion: true,
        scope: true,
        royaltyDescription: true,
        workId: true,
        designerUserId: true,
        ownerUserId: true,
        updatedAt: true
      }
    });
    const restoringRevokedPausedAuthorization = project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
      && project.status === CollaborationProjectStatus.PLANNING
      && project.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.REVOKED
      && existingAuthorization?.status === ProjectDesignAuthorizationStatus.REVOKED;
    const authorizationLockedStatuses: readonly LimitedPreorderStatus[] = [
      LimitedPreorderStatus.OPEN,
      LimitedPreorderStatus.PAUSED,
      LimitedPreorderStatus.GOAL_REACHED,
      LimitedPreorderStatus.PRODUCTION
    ];
    if (
      project.presaleCampaign
      && authorizationLockedStatuses.includes(project.presaleCampaign.preorderStatus)
      && !restoringRevokedPausedAuthorization
    ) {
      throw new Error("限量预售正在接单、结算或生产，不能用新授权请求覆盖现有授权状态。");
    }

    const ownerUserId = project.ownerUserId ?? project.createdById ?? user.id;
    const policy = projectDesignAuthorizationPolicy(project.presaleCampaign?.id ?? null);
    const pendingRequiresStandardRefresh = Boolean(
      existingAuthorization
      && existingAuthorization.status === ProjectDesignAuthorizationStatus.PENDING
      && (
        existingAuthorization.termsVersion !== policy.termsVersion
        || existingAuthorization.preorderCampaignId !== policy.preorderCampaignId
        || existingAuthorization.scope !== policy.scope
        || existingAuthorization.royaltyDescription !== policy.royaltyNotice
        || existingAuthorization.workId !== project.workId
        || existingAuthorization.designerUserId !== project.work.userId
        || existingAuthorization.ownerUserId !== ownerUserId
      )
    );
    if (existingAuthorization?.status === ProjectDesignAuthorizationStatus.ACCEPTED) {
      throw new Error("作品作者已经接受授权，项目方不能重新发起并覆盖该决定。");
    }
    if (
      existingAuthorization?.status === ProjectDesignAuthorizationStatus.PENDING
      && !pendingRequiresStandardRefresh
    ) {
      throw new Error("标准授权邀请已经发送，正在等待作品作者决定。");
    }

    const nextData = nextAuthorizationRequestData(policy.termsVersion);
    let authorization: { id: string; status: ProjectDesignAuthorizationStatus };
    if (existingAuthorization) {
      const changed = await tx.projectDesignAuthorization.updateMany({
        where: {
          id: existingAuthorization.id,
          status: existingAuthorization.status,
          updatedAt: existingAuthorization.updatedAt
        },
        data: {
          workId: project.workId,
          preorderCampaignId: policy.preorderCampaignId,
          designerUserId: project.work.userId,
          ownerUserId,
          scope: policy.scope,
          royaltyDescription: policy.royaltyNotice,
          ...nextData
        }
      });
      if (changed.count !== 1) throw new Error("设计授权状态已变化，请刷新后重试");
      authorization = { id: existingAuthorization.id, status: ProjectDesignAuthorizationStatus.PENDING };
    } else {
      authorization = await tx.projectDesignAuthorization.create({
        data: {
          projectId,
          workId: project.workId,
          preorderCampaignId: policy.preorderCampaignId,
          designerUserId: project.work.userId,
          ownerUserId,
          scope: policy.scope,
          royaltyDescription: policy.royaltyNotice,
          ...nextData
        },
        select: { id: true, status: true }
      });
    }

    const projectChanged = await tx.collaborationProject.updateMany({
      where: {
        id: projectId,
        updatedAt: project.updatedAt,
        status: project.status,
        designerAuthorizationStatus: project.designerAuthorizationStatus
      },
      data: { designerAuthorizationStatus: ProjectDesignAuthorizationStatus.PENDING }
    });
    if (projectChanged.count !== 1) throw new Error("项目或预售状态已变化，请刷新后重试");
    await tx.adminLog.create({
      data: {
        adminId: user.id,
        action: "PROJECT_DESIGN_AUTHORIZATION_REQUEST",
        targetType: "ProjectDesignAuthorization",
        targetId: authorization.id,
        detail: {
          projectId,
          status: authorization.status,
          termsVersion: policy.termsVersion,
          preorderCampaignId: policy.preorderCampaignId,
          policy: policy.label,
          requestMode: "SELF_SERVICE_STANDARD"
        }
      }
    });
    return {
      recipientId: project.work.userId,
      projectTitle: project.title,
      workTitle: project.work.title,
      policyLabel: policy.label
    };
  });

  await createNotificationSafe({
    recipientId: notification.recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.REQUEST_HANDLED,
    title: "新的设计授权请求",
    body: notification.projectTitle + " 向你发送了《" + notification.workTitle + "》的" + notification.policyLabel + "标准授权邀请，请你独立核对范围并决定是否接受。",
    targetUrl: "/me/authorizations",
    dedupe: true
  });
  revalidatePath("/me/authorizations");
  revalidatePath("/me/projects");
  revalidatePath(`/me/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

export async function respondProjectDesignAuthorization(formData: FormData) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) throw new Error("项目市场功能尚未开放");
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const projectId = requiredText(formData.get("projectId"), "项目 ID");
  const status = authorizationResponse(formData.get("status"));
  const notification = await runProjectAuthorizationTransaction(async (tx) => {
    const authorization = await tx.projectDesignAuthorization.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            workId: true,
            ownerUserId: true,
            createdById: true,
            designerAuthorizationStatus: true,
            updatedAt: true,
            work: { select: { userId: true } },
            presaleCampaign: { select: { id: true, preorderStatus: true } }
          }
        }
      }
    });
    if (!authorization) throw new Error("授权记录不存在");
    if (ownerCannotRespondToAuthorization(user, authorization)) throw new Error("项目主理人不能代替设计师授权");
    if (!canDesignerRespondToAuthorization(user, authorization)) throw new Error("只有作品作者本人可以处理设计授权");
    if (authorization.status !== ProjectDesignAuthorizationStatus.PENDING) {
      throw new Error("该邀请已经处理；接受或拒绝只能针对等待决定的邀请。已接受授权如需撤销，请使用撤销流程。");
    }
    const currentOwnerUserId = authorization.project.ownerUserId ?? authorization.project.createdById;
    const policy = projectDesignAuthorizationPolicy(authorization.project.presaleCampaign?.id ?? null);
    const standardInvitationValid = Boolean(
      currentOwnerUserId
      && authorization.termsVersion === policy.termsVersion
      && authorization.preorderCampaignId === policy.preorderCampaignId
      && authorization.scope === policy.scope
      && authorization.royaltyDescription === policy.royaltyNotice
      && authorization.workId === authorization.project.workId
      && authorization.designerUserId === authorization.project.work?.userId
      && authorization.ownerUserId === currentOwnerUserId
    );
    if (status === ProjectDesignAuthorizationStatus.ACCEPTED && !standardInvitationValid) {
      throw new Error("该邀请不是当前项目负责人的有效标准授权，请让项目负责人重新发送标准邀请。");
    }
    if (
      status !== ProjectDesignAuthorizationStatus.ACCEPTED
      && authorization.project.presaleCampaign
      && authorization.project.presaleCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
    ) {
      throw new Error("限量预售已经开始；如需撤销授权，请使用撤销流程，系统会同步停止接单并保留订单审计。");
    }

    const authorizationChanged = await tx.projectDesignAuthorization.updateMany({
      where: { id: authorization.id, status: ProjectDesignAuthorizationStatus.PENDING, updatedAt: authorization.updatedAt },
      data: {
        status,
        acceptedAt: status === ProjectDesignAuthorizationStatus.ACCEPTED ? new Date() : null,
        revokedAt: null
      }
    });
    if (authorizationChanged.count !== 1) throw new Error("设计授权状态已变化，请刷新后重试");
    const projectChanged = await tx.collaborationProject.updateMany({
      where: {
        id: projectId,
        updatedAt: authorization.project.updatedAt,
        status: authorization.project.status,
        designerAuthorizationStatus: authorization.project.designerAuthorizationStatus
      },
      data: {
        designerAuthorizationStatus: status,
        ...(status !== ProjectDesignAuthorizationStatus.ACCEPTED
          ? { status: CollaborationProjectStatus.PLANNING }
          : authorization.project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
            && authorization.project.status === CollaborationProjectStatus.PLANNING
            ? { status: CollaborationProjectStatus.PREORDER_READY }
          : {})
      }
    });
    if (projectChanged.count !== 1) throw new Error("项目或预售状态已变化，请刷新后重试");
    await tx.adminLog.create({
      data: {
        adminId: user.id,
        action: "PROJECT_DESIGN_AUTHORIZATION_RESPONSE",
        targetType: "ProjectDesignAuthorization",
        targetId: authorization.id,
        detail: { projectId, status }
      }
    });
    return { recipientId: authorization.ownerUserId };
  });

  await createNotificationSafe({
    recipientId: notification.recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.REQUEST_HANDLED,
    title: status === ProjectDesignAuthorizationStatus.ACCEPTED ? "设计授权已接受" : "设计授权未接受",
    body: status === ProjectDesignAuthorizationStatus.ACCEPTED
      ? "作品作者已接受本次设计授权。你可以回到项目工作台，按双方约定继续推进。"
      : "作品作者未接受本次设计授权。请尊重该决定，并仅在获得新意愿后重新协商。",
    targetUrl: "/me/projects/" + projectId,
    dedupe: true
  });
  revalidatePath("/me/projects");
  revalidatePath(`/me/projects/${projectId}`);
  revalidatePath("/me/authorizations");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}/preorder`);
}

export async function revokeProjectDesignAuthorization(formData: FormData) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) throw new Error("项目市场功能尚未开放");
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const projectId = requiredText(formData.get("projectId"), "项目ID");
  const notification = await runProjectAuthorizationTransaction(async (tx) => {
    const authorization = await tx.projectDesignAuthorization.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            designerAuthorizationStatus: true,
            updatedAt: true,
            presaleCampaign: { select: { id: true, preorderStatus: true } }
          }
        }
      }
    });
    if (!authorization) throw new Error("授权记录不存在");
    if (!canDesignerRespondToAuthorization(user, authorization)) throw new Error("只有作品作者本人可以撤销设计授权");
    if (authorization.status !== ProjectDesignAuthorizationStatus.ACCEPTED) throw new Error("只有已接受的设计授权可以撤销");
    const campaign = authorization.project.presaleCampaign;
    if (campaign && ([LimitedPreorderStatus.GOAL_REACHED, LimitedPreorderStatus.PRODUCTION] as readonly LimitedPreorderStatus[]).includes(campaign.preorderStatus)) {
      throw new Error("活动已成团或进入生产，涉及现有订单与履约义务；请联系管理员通过取消与退款异常流程处理，不能直接撤销。");
    }

    const authorizationChanged = await tx.projectDesignAuthorization.updateMany({
      where: {
        id: authorization.id,
        status: ProjectDesignAuthorizationStatus.ACCEPTED,
        updatedAt: authorization.updatedAt
      },
      data: { status: ProjectDesignAuthorizationStatus.REVOKED, revokedAt: new Date() }
    });
    if (authorizationChanged.count !== 1) throw new Error("设计授权状态已变化，请刷新后重试");
    const projectChanged = await tx.collaborationProject.updateMany({
      where: {
        id: projectId,
        updatedAt: authorization.project.updatedAt,
        status: authorization.project.status,
        designerAuthorizationStatus: authorization.project.designerAuthorizationStatus
      },
      data: {
        designerAuthorizationStatus: ProjectDesignAuthorizationStatus.REVOKED,
        status: CollaborationProjectStatus.PLANNING
      }
    });
    if (projectChanged.count !== 1) throw new Error("项目或预售状态已变化，请刷新后重试");
    if (campaign?.preorderStatus === LimitedPreorderStatus.OPEN) {
      const paused = await tx.presaleCampaign.updateMany({
        where: { id: campaign.id, preorderStatus: LimitedPreorderStatus.OPEN },
        data: {
          preorderStatus: LimitedPreorderStatus.PAUSED,
          preorderPausedAt: new Date(),
          preorderDecisionReason: "设计师撤销授权，系统自动停止接单",
          preorderPublicNotice: "作品授权状态已变化，本期预售已暂停接单，平台正在处理后续安排。"
        }
      });
      if (paused.count !== 1) throw new Error("预售活动状态已变化，请刷新后重试");
      await tx.projectProduct.updateMany({
        where: { projectId, preorderCampaignId: campaign.id, status: "PREORDER_OPEN" },
        data: { status: "PAUSED" }
      });
      await tx.commerceStateEvent.create({
        data: {
          aggregateType: "CAMPAIGN",
          aggregateId: campaign.id,
          fromState: LimitedPreorderStatus.OPEN,
          toState: LimitedPreorderStatus.PAUSED,
          actorId: user.id,
          reason: "DESIGN_AUTHORIZATION_REVOKED",
          metadata: { projectId, authorizationId: authorization.id }
        }
      });
    }
    await tx.adminLog.create({
      data: {
        adminId: user.id,
        action: "PROJECT_DESIGN_AUTHORIZATION_REVOKE",
        targetType: "ProjectDesignAuthorization",
        targetId: authorization.id,
        detail: { projectId, status: ProjectDesignAuthorizationStatus.REVOKED, campaignId: campaign?.id ?? null, campaignPaused: campaign?.preorderStatus === LimitedPreorderStatus.OPEN }
      }
    });
    return { recipientId: authorization.ownerUserId };
  });

  await createNotificationSafe({
    recipientId: notification.recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.REQUEST_HANDLED,
    title: "设计授权已撤销",
    body: "作品作者已撤销本次设计授权。项目已回到规划阶段，请停止依赖该授权继续推进并重新沟通。",
    targetUrl: "/me/projects/" + projectId,
    dedupe: true
  });
  revalidatePath("/me/projects");
  revalidatePath(`/me/projects/${projectId}`);
  revalidatePath("/me/authorizations");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}/preorder`);
}

export async function updateProjectOrder(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");

  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("订单 ID 缺失");

  const status = enumValue(formData.get("status"), Object.values(ProjectOrderStatus), ProjectOrderStatus.RESERVATION);
  const fulfillmentStatus = enumValue(formData.get("fulfillmentStatus"), Object.values(ProjectOrderFulfillmentStatus), ProjectOrderFulfillmentStatus.NOT_STARTED);
  const requestedPaymentStatusValue = formData.get("paymentStatus");
  const paymentReason = optionalText(formData.get("paymentReason"));
  const statusReason = optionalText(formData.get("statusReason"));
  const trackingCompany = optionalText(formData.get("trackingCompany"));
  const trackingNumber = optionalText(formData.get("trackingNumber"));
  const exceptionNote = optionalText(formData.get("exceptionNote"));
  const note = optionalText(formData.get("note"));
  const manualPaymentPilotEnabled = await isFeatureEnabled("feature.manual_payment_pilot");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.projectOrder.findUnique({
          where: { id },
          select: {
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            totalAmount: true,
            updatedAt: true,
            reservationExpiresAt: true,
            preorderCampaignId: true,
            refunds: {
              where: { status: CommerceRefundStatus.SUCCEEDED },
              select: { amount: true }
            },
            preorderCampaign: {
              select: {
                preorderStatus: true,
                preorderQualificationMode: true,
                preorderDeadline: true
              }
            }
          }
        });
        if (!order) throw new Error("订单不存在");

        const requestedPaymentStatus = enumValue(requestedPaymentStatusValue, Object.values(ProjectOrderPaymentStatus), order.paymentStatus);
        if (
          order.preorderCampaignId
          && requestedPaymentStatus !== order.paymentStatus
          && (requestedPaymentStatus === ProjectOrderPaymentStatus.PENDING || requestedPaymentStatus === ProjectOrderPaymentStatus.PAID)
        ) {
          throw new Error("本批 V2.3 仅验证真实订单意向，退款记录闭环完成前不得新增待确认付款或已付款义务");
        }
        const safeNonCollectionStatus = requestedPaymentStatus === ProjectOrderPaymentStatus.FAILED
          || requestedPaymentStatus === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
          || requestedPaymentStatus === ProjectOrderPaymentStatus.REFUNDED;
        const paymentUpdate = resolveManualPaymentStatusUpdate({
          actor: { ...user, manualPaymentPilotEnabled: manualPaymentPilotEnabled || safeNonCollectionStatus },
          oldStatus: order.paymentStatus,
          requestedStatus: requestedPaymentStatus,
          reason: paymentReason
        });
        if (!paymentUpdate.ok) throw new Error(paymentUpdate.error);
        const effectiveStatus = paymentUpdate.changed
          && paymentUpdate.status === ProjectOrderPaymentStatus.PAID
          && status === order.status
          && ([ProjectOrderStatus.RESERVATION, ProjectOrderStatus.PENDING_PAYMENT] as readonly ProjectOrderStatus[]).includes(order.status)
          ? ProjectOrderStatus.CONFIRMED
          : status;
        const effectiveStatusReason = statusReason ?? (effectiveStatus !== order.status ? paymentReason : null);
        if (!canTransitionOrderStatus(order.status, effectiveStatus)) throw new Error("订单状态不允许这样跳转");
        if (!canTransitionFulfillmentStatus(order.fulfillmentStatus, fulfillmentStatus)) throw new Error("履约状态不允许这样跳转");
        if (effectiveStatus !== order.status && !effectiveStatusReason) throw new Error("修改订单状态必须填写原因");
        if (fulfillmentStatus !== order.fulfillmentStatus && !statusReason) throw new Error("修改履约状态必须填写原因");
        if (
          effectiveStatus === ProjectOrderStatus.CANCELLED
          && (
            paymentUpdate.status === ProjectOrderPaymentStatus.PAID
            || paymentUpdate.status === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
          )
        ) {
          throw new Error("已付款或部分退款订单不能直接取消，必须进入退款待处理并保留资金义务");
        }
        if (
          order.preorderCampaignId
          && order.status === ProjectOrderStatus.PRODUCTION
          && effectiveStatus === ProjectOrderStatus.CANCELLED
          && fulfillmentStatus !== ProjectOrderFulfillmentStatus.EXCEPTION
        ) {
          throw new Error("生产中的未付款订单取消时必须同时把履约状态标记为异常，保留生产终止记录");
        }
        if (effectiveStatus === ProjectOrderStatus.CONFIRMED && order.status !== ProjectOrderStatus.CONFIRMED && order.reservationExpiresAt && order.reservationExpiresAt <= new Date()) {
          throw new Error("订单名额锁定已过期，不能直接确认，请让用户重新提交或由管理员处理异常");
        }
        if (order.preorderCampaignId) {
          if (!order.preorderCampaign) throw new Error("订单关联的限量预售活动不存在");
          if (
            order.preorderCampaign.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER
            && effectiveStatus === ProjectOrderStatus.CONFIRMED
            && paymentUpdate.status !== ProjectOrderPaymentStatus.PAID
          ) {
            throw new Error("按付款成团的订单只有在确认到账后才能标记为已确认");
          }
          if (
            order.preorderCampaign.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER
            && paymentUpdate.changed
            && paymentUpdate.status === ProjectOrderPaymentStatus.PAID
            && (
              !order.preorderCampaign.preorderDeadline
              || order.preorderCampaign.preorderDeadline <= new Date()
              || !order.reservationExpiresAt
              || order.reservationExpiresAt <= new Date()
            )
          ) {
            throw new Error("付款确认已超过本期截止时间或订单名额锁定期，不能计入本期成团");
          }
          if (
            paymentUpdate.changed
            && (
              paymentUpdate.status === ProjectOrderPaymentStatus.PENDING
              || paymentUpdate.status === ProjectOrderPaymentStatus.PAID
            )
            && ([
              LimitedPreorderStatus.NOT_STARTED,
              LimitedPreorderStatus.FAILED,
              LimitedPreorderStatus.CANCELLED,
              LimitedPreorderStatus.CLOSED
            ] as readonly LimitedPreorderStatus[]).includes(order.preorderCampaign.preorderStatus)
          ) {
            throw new Error("活动未开始、已失败、已取消或已结束，不能新增待确认付款或已付款义务");
          }
          const requiresProductionCampaign = ([ProjectOrderStatus.IN_PROGRESS, ProjectOrderStatus.PRODUCTION, ProjectOrderStatus.SHIPPED, ProjectOrderStatus.COMPLETED] as readonly ProjectOrderStatus[]).includes(effectiveStatus)
            || fulfillmentStatus !== ProjectOrderFulfillmentStatus.NOT_STARTED;
          if (requiresProductionCampaign && order.preorderCampaign.preorderStatus !== LimitedPreorderStatus.PRODUCTION) {
            throw new Error("限量预售活动尚未进入生产，不能提前推进订单或履约状态");
          }
          if (
            effectiveStatus === ProjectOrderStatus.PRODUCTION
            && fulfillmentStatus === ProjectOrderFulfillmentStatus.NOT_STARTED
          ) {
            throw new Error("生产中订单的履约状态不能仍为未开始");
          }
          if (
            effectiveStatus === ProjectOrderStatus.SHIPPED
            && !([
              ProjectOrderFulfillmentStatus.SHIPPED,
              ProjectOrderFulfillmentStatus.DELIVERED,
              ProjectOrderFulfillmentStatus.EXCEPTION
            ] as readonly ProjectOrderFulfillmentStatus[]).includes(fulfillmentStatus)
          ) {
            throw new Error("已发货订单的履约状态必须为已发货、已送达或异常");
          }
          if (effectiveStatus === ProjectOrderStatus.COMPLETED && fulfillmentStatus !== ProjectOrderFulfillmentStatus.DELIVERED) {
            throw new Error("已完成订单必须已有送达履约记录");
          }
        }

        const succeededRefundAmount = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);
        const changingToPartiallyRefunded = paymentUpdate.changed && paymentUpdate.status === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED;
        const changingToFullyRefunded = paymentUpdate.changed && paymentUpdate.status === ProjectOrderPaymentStatus.REFUNDED;
        const changingOrderToRefunded = effectiveStatus !== order.status && effectiveStatus === ProjectOrderStatus.REFUNDED;
        const enteringRefundPending = effectiveStatus === ProjectOrderStatus.REFUND_PENDING && order.status !== ProjectOrderStatus.REFUND_PENDING;
        const fullyRefundedWithEvidence = paymentUpdate.status === ProjectOrderPaymentStatus.REFUNDED
          && order.totalAmount !== null
          && order.totalAmount > 0
          && succeededRefundAmount >= order.totalAmount;
        if (
          order.preorderCampaignId
          && enteringRefundPending
          && paymentUpdate.status !== ProjectOrderPaymentStatus.PAID
          && paymentUpdate.status !== ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
          && !fullyRefundedWithEvidence
        ) {
          throw new Error("未付款的限量预售订单不能进入退款待处理；请改为取消，只有真实资金义务才能进入退款流程");
        }
        if (effectiveStatus === ProjectOrderStatus.REFUNDED && paymentUpdate.status !== ProjectOrderPaymentStatus.REFUNDED) {
          throw new Error("订单标记为已退款时，付款状态也必须是已全额退款");
        }
        if (
          (paymentUpdate.status === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED || paymentUpdate.status === ProjectOrderPaymentStatus.REFUNDED)
          && effectiveStatus !== ProjectOrderStatus.REFUND_PENDING
          && effectiveStatus !== ProjectOrderStatus.REFUNDED
        ) {
          throw new Error("退款付款状态只能用于退款待处理或已退款订单");
        }
        if ((changingToPartiallyRefunded || changingToFullyRefunded || changingOrderToRefunded) && succeededRefundAmount <= 0) {
          throw new Error("没有成功退款记录，不能把订单或付款状态标记为已退款");
        }
        if (changingToPartiallyRefunded && order.totalAmount !== null && succeededRefundAmount >= order.totalAmount) {
          throw new Error("成功退款金额已覆盖订单总额，付款状态应标记为已全额退款");
        }
        if (changingToFullyRefunded || changingOrderToRefunded) {
          if (order.totalAmount === null || order.totalAmount <= 0 || succeededRefundAmount < order.totalAmount) {
            throw new Error("成功退款金额尚未覆盖订单总额，不能标记为已全额退款");
          }
        }

        const changed = await tx.projectOrder.updateMany({
          where: {
            id,
            updatedAt: order.updatedAt,
            status: order.status,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus
          },
          data: {
            status: effectiveStatus,
            paymentStatus: paymentUpdate.status,
            fulfillmentStatus,
            trackingCompany,
            trackingNumber,
            exceptionNote,
            note,
            cancelledAt: effectiveStatus === ProjectOrderStatus.CANCELLED && order.status !== ProjectOrderStatus.CANCELLED ? new Date() : undefined,
            cancellationReason: effectiveStatus === ProjectOrderStatus.CANCELLED && order.status !== ProjectOrderStatus.CANCELLED ? effectiveStatusReason : undefined,
            reservationExpiresAt: effectiveStatus === ProjectOrderStatus.CONFIRMED ? null : undefined
          }
        });
        if (changed.count !== 1) throw new Error("订单状态已变化，请刷新后重试");
        if (effectiveStatus !== order.status) {
          await tx.commerceStateEvent.create({ data: {
            aggregateType: "ORDER",
            aggregateId: id,
            fromState: order.status,
            toState: effectiveStatus,
            actorId: user.id,
            reason: effectiveStatusReason,
            metadata: { oldFulfillmentStatus: order.fulfillmentStatus, newFulfillmentStatus: fulfillmentStatus }
          } });
        }
        await tx.adminLog.create({
          data: {
          adminId: user.id,
          action: "PROJECT_ORDER_UPDATE",
          targetType: "ProjectOrder",
          targetId: id,
          detail: {
            oldStatus: order.status,
            newStatus: effectiveStatus,
            oldFulfillmentStatus: order.fulfillmentStatus,
            newFulfillmentStatus: fulfillmentStatus,
            statusReason: effectiveStatusReason ?? statusReason,
            ...(paymentUpdate.changed
              ? {
                  orderId: id,
                  oldPaymentStatus: order.paymentStatus,
                  newPaymentStatus: paymentUpdate.status,
                  adminUserId: user.id,
                  reason: paymentReason,
                  timestamp: new Date().toISOString()
                }
              : { paymentStatus: paymentUpdate.status })
          }
          }
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/preorders");
}
