"use server";

import { revalidatePath } from "next/cache";
import {
  CommerceAggregateType,
  CommerceRefundStatus,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  NotificationType,
  CollaborationProjectStatus,
  Prisma,
  ProjectDesignAuthorizationStatus,
  ProjectIssueStatus,
  ProjectOrderFulfillmentStatus,
  ProjectOrderConfirmationChannel,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus,
  ProjectProductStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/features";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { projectDesignAuthorizationPolicy } from "@/lib/projects/design-authorization-policy";
import {
  createLimitedPreorderOfferEnvelope,
  hashLimitedPreorderOfferSnapshot,
  readLimitedPreorderOfferSnapshot
} from "@/lib/projects/preorder-offer";
import {
  assertNoLimitedPreorderPaymentSolicitation,
  hasCurrentLimitedPreorderAuthorization
} from "@/lib/projects/preorder-lifecycle";
import { readProjectOrderProductSnapshot } from "@/lib/projects/order-snapshots";
import {
  canDesignerRespondToAuthorization,
  canPrepareManagedLimitedPreorderProject,
  canManageProject,
  canRequestProjectDesignAuthorization,
  canTransitionFulfillmentStatus,
  canTransitionOrderStatus,
  nextAuthorizationRequestData,
  ownerCannotRespondToAuthorization,
  resolveManualPaymentStatusUpdate
} from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { isPublicQualityWork } from "@/lib/works/rules";

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
  const expectedOfferHash = optionalText(formData.get("expectedOfferHash"));
  const confirmedOfferEnvelope = formData.get("confirmOfferEnvelope") === "on";
  const notification = await runProjectAuthorizationTransaction(async (tx) => {
    const project = await tx.collaborationProject.findUnique({
      where: { id: projectId },
      include: {
        work: {
          select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            reviewStatus: true,
            contentStatus: true,
            visibility: true,
            images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } }
          }
        },
        presaleCampaign: {
          select: {
            id: true,
            workId: true,
            title: true,
            description: true,
            estimatedPrice: true,
            priceNote: true,
            sizeOptions: true,
            colorOptions: true,
            preorderStatus: true,
            preorderQualificationMode: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true,
            preorderTermsVersion: true,
            preorderTermsText: true,
            preorderPaymentInstructions: true
          }
        },
        products: { include: { skus: true } }
      }
    });
    if (!project || !canRequestProjectDesignAuthorization(user, project)) throw new Error("只有项目发起人可以邀请作品作者授权");
    if (!project.workId || !project.work) throw new Error("该项目尚未关联公开作品，不能申请设计授权");
    if (project.presaleCampaign && !isPublicQualityWork(project.work)) {
      throw new Error("关联作品尚未通过公开质量审核，不能发送本期限量预售授权邀请。");
    }
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
        offerHash: true,
        offerSnapshot: true,
        updatedAt: true
      }
    });
    const restoringRevokedPausedAuthorization = project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
      && project.status === CollaborationProjectStatus.PLANNING
      && project.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.REVOKED
      && existingAuthorization?.status === ProjectDesignAuthorizationStatus.REVOKED;
    if (
      project.presaleCampaign
      && project.presaleCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
      && !restoringRevokedPausedAuthorization
    ) {
      throw new Error("只有尚未开始的活动可以首次发送授权邀请；暂停活动仅允许在作者撤销后重新邀请，失败、取消或归档活动不能再发邀请。");
    }
    if (project.presaleCampaign && !canPrepareManagedLimitedPreorderProject(project.status)) {
      throw new Error("项目当前处于生产、质检、发货、完成或取消等非预售准备阶段，不能发送限量预售授权邀请。");
    }

    const ownerUserId = project.ownerUserId ?? project.createdById;
    if (!ownerUserId) throw new Error("项目尚未绑定真实负责人，不能发送授权邀请。");
    const policy = projectDesignAuthorizationPolicy(project.presaleCampaign?.id ?? null);
    const offer = project.presaleCampaign
      ? createLimitedPreorderOfferEnvelope({
          projectId,
          projectTitle: project.title,
          projectDescription: project.description,
          projectTargetQuantity: project.targetQuantity,
          projectEstimatedBudget: project.estimatedBudget,
          workTitle: project.work.title,
          workDescription: project.work.description,
          campaign: project.presaleCampaign,
          products: project.products,
          displayImageUrls: project.work.images.map((image) => image.imageUrl)
        })
      : null;
    if (
      project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.NOT_STARTED
      && project.products.some((product) => !([
        ProjectProductStatus.DRAFT,
        ProjectProductStatus.APPROVED
      ] as readonly ProjectProductStatus[]).includes(product.status))
    ) {
      throw new Error("尚未开始的 V2.3 活动只能用草稿或已审核商品准备最终资料；暂停、售罄或已开放商品必须先完成状态审查");
    }
    if (offer?.issues.length) {
      throw new Error(`请先完成最终开售资料包再邀请作者：${offer.issues.map((item) => item.message).join("；")}`);
    }
    if (offer && (!confirmedOfferEnvelope || expectedOfferHash !== offer.hash)) {
      throw new Error("最终开售资料已变化或尚未由项目负责人完整确认，请刷新并重新核对价格、限量、交付、图片、条款与 SKU 后再发送");
    }
    const existingOfferSnapshot = readLimitedPreorderOfferSnapshot(existingAuthorization?.offerSnapshot);
    const existingOfferSnapshotValid = !offer || Boolean(
      existingOfferSnapshot
      && existingAuthorization?.offerHash
      && hashLimitedPreorderOfferSnapshot(existingOfferSnapshot) === existingAuthorization.offerHash
    );
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
        || existingAuthorization.offerHash !== (offer?.hash ?? null)
        || !existingOfferSnapshotValid
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
          offerHash: offer?.hash ?? null,
          offerSnapshot: offer ? offer.snapshot as Prisma.InputJsonValue : Prisma.DbNull,
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
          offerHash: offer?.hash ?? null,
          offerSnapshot: offer ? offer.snapshot as Prisma.InputJsonValue : Prisma.DbNull,
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
          requestMode: "SELF_SERVICE_STANDARD",
          offerHash: offer?.hash ?? null,
          ownerConfirmedOfferHash: offer?.hash ?? null,
          ownerConfirmedOfferAt: offer ? new Date().toISOString() : null
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
  const authorizationId = requiredText(formData.get("authorizationId"), "授权邀请");
  const expectedUpdatedAtText = requiredText(formData.get("expectedUpdatedAt"), "邀请版本");
  const expectedUpdatedAt = new Date(expectedUpdatedAtText);
  if (!Number.isFinite(expectedUpdatedAt.getTime())) {
    throw new Error("邀请版本无效，请刷新页面后重试");
  }
  const status = authorizationResponse(formData.get("status"));
  const notification = await runProjectAuthorizationTransaction(async (tx) => {
    const authorization = await tx.projectDesignAuthorization.findUnique({
      where: { id: authorizationId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            targetQuantity: true,
            estimatedBudget: true,
            status: true,
            workId: true,
            ownerUserId: true,
            createdById: true,
            designerAuthorizationStatus: true,
            updatedAt: true,
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
            presaleCampaign: {
              select: {
                id: true,
                workId: true,
                title: true,
                description: true,
                estimatedPrice: true,
                priceNote: true,
                sizeOptions: true,
                colorOptions: true,
                preorderStatus: true,
                preorderQualificationMode: true,
                preorderTargetQuantity: true,
                preorderCapacity: true,
                preorderDeadline: true,
                preorderTermsVersion: true,
                preorderTermsText: true,
                preorderPaymentInstructions: true
              }
            },
            products: { include: { skus: true } }
          }
        }
      }
    });
    if (!authorization) throw new Error("授权记录不存在");
    if (authorization.projectId !== projectId) {
      throw new Error("授权邀请与项目不匹配，请刷新页面后重试");
    }
    if (authorization.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new Error("授权邀请内容或版本已变化，请重新核对后再决定");
    }
    if (ownerCannotRespondToAuthorization(user, authorization)) throw new Error("项目主理人不能代替设计师授权");
    if (!canDesignerRespondToAuthorization(user, authorization)) throw new Error("只有作品作者本人可以处理设计授权");
    if (authorization.status !== ProjectDesignAuthorizationStatus.PENDING) {
      throw new Error("该邀请已经处理；接受或拒绝只能针对等待决定的邀请。已接受授权如需撤销，请使用撤销流程。");
    }
    const currentOwnerUserId = authorization.project.ownerUserId ?? authorization.project.createdById;
    const policy = projectDesignAuthorizationPolicy(authorization.project.presaleCampaign?.id ?? null);
    const currentOffer = authorization.project.presaleCampaign
      ? createLimitedPreorderOfferEnvelope({
          projectId,
          projectTitle: authorization.project.title,
          projectDescription: authorization.project.description,
          projectTargetQuantity: authorization.project.targetQuantity,
          projectEstimatedBudget: authorization.project.estimatedBudget,
          workTitle: authorization.project.work?.title ?? "",
          workDescription: authorization.project.work?.description ?? null,
          campaign: authorization.project.presaleCampaign,
          products: authorization.project.products,
          displayImageUrls: authorization.project.work?.images.map((image) => image.imageUrl) ?? []
        })
      : null;
    const storedOfferSnapshot = readLimitedPreorderOfferSnapshot(authorization.offerSnapshot);
    const storedOfferValid = !currentOffer || Boolean(
      storedOfferSnapshot
      && authorization.offerHash
      && hashLimitedPreorderOfferSnapshot(storedOfferSnapshot) === authorization.offerHash
    );
    const standardInvitationValid = Boolean(
      currentOwnerUserId
      && authorization.termsVersion === policy.termsVersion
      && authorization.preorderCampaignId === policy.preorderCampaignId
      && authorization.scope === policy.scope
      && authorization.royaltyDescription === policy.royaltyNotice
      && authorization.workId === authorization.project.workId
      && authorization.designerUserId === authorization.project.work?.userId
      && authorization.ownerUserId === currentOwnerUserId
      && authorization.offerHash === (currentOffer?.hash ?? null)
      && (!currentOffer || currentOffer.issues.length === 0)
      && storedOfferValid
    );
    if (status === ProjectDesignAuthorizationStatus.ACCEPTED && !standardInvitationValid) {
      throw new Error("该邀请不是当前项目负责人的有效标准授权，请让项目负责人重新发送标准邀请。");
    }
    if (
      status === ProjectDesignAuthorizationStatus.ACCEPTED
      && authorization.project.presaleCampaign
      && (!authorization.project.work || !isPublicQualityWork(authorization.project.work))
    ) {
      throw new Error("关联作品已下架、待审核或不再公开，当前不能接受限量预售授权邀请。");
    }
    const pausedReinvite = Boolean(
      authorization.project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
      && authorization.project.status === CollaborationProjectStatus.PLANNING
      && authorization.project.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.PENDING
      && authorization.preorderCampaignId === authorization.project.presaleCampaign.id
    );
    if (
      authorization.project.presaleCampaign
      && authorization.project.presaleCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
      && !pausedReinvite
    ) {
      throw new Error("活动已开放、达标、失败、取消、生产或归档，当前邀请不能再接受或拒绝；请联系平台按生命周期记录处理。");
    }

    const authorizationChanged = await tx.projectDesignAuthorization.updateMany({
      where: {
        id: authorizationId,
        projectId,
        status: ProjectDesignAuthorizationStatus.PENDING,
        updatedAt: expectedUpdatedAt
      },
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
        ...(status === ProjectDesignAuthorizationStatus.ACCEPTED
          && authorization.project.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
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
        detail: { projectId, status, offerHash: authorization.offerHash }
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
    const v23DerivedProjectStage = Boolean(
      campaign
      && authorization.preorderCampaignId === campaign.id
      && ([CollaborationProjectStatus.PREORDER_READY, CollaborationProjectStatus.PREORDER_OPEN] as readonly CollaborationProjectStatus[])
        .includes(authorization.project.status)
    );
    const projectChanged = await tx.collaborationProject.updateMany({
      where: {
        id: projectId,
        updatedAt: authorization.project.updatedAt,
        status: authorization.project.status,
        designerAuthorizationStatus: authorization.project.designerAuthorizationStatus
      },
      data: {
        designerAuthorizationStatus: ProjectDesignAuthorizationStatus.REVOKED,
        ...(v23DerivedProjectStage ? { status: CollaborationProjectStatus.PLANNING } : {})
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
        detail: {
          projectId,
          status: ProjectDesignAuthorizationStatus.REVOKED,
          campaignId: campaign?.id ?? null,
          campaignPaused: campaign?.preorderStatus === LimitedPreorderStatus.OPEN,
          oldProjectStatus: authorization.project.status,
          newProjectStatus: v23DerivedProjectStage ? CollaborationProjectStatus.PLANNING : authorization.project.status
        }
      }
    });
    return { recipientId: authorization.ownerUserId, projectStageReset: v23DerivedProjectStage };
  });

  await createNotificationSafe({
    recipientId: notification.recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.REQUEST_HANDLED,
    title: "设计授权已撤销",
    body: notification.projectStageReset
      ? "作品作者已撤销本次设计授权。限量预售相关项目阶段已回到规划状态，请停止依赖该授权继续推进并重新沟通。"
      : "作品作者已撤销本次设计授权。原有项目业务阶段保持不变，但不得再依赖本授权继续预售或生产，请重新沟通。",
    targetUrl: "/me/projects/" + projectId,
    dedupe: true
  });
  revalidatePath("/me/projects");
  revalidatePath(`/me/projects/${projectId}`);
  revalidatePath("/me/authorizations");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}/preorder`);
}

export async function confirmLimitedPreorderOrder(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) throw new Error("Limited Preorder V2.3 功能开关未开启");

  const id = requiredText(formData.get("id"), "订单 ID");
  const channelValue = requiredText(formData.get("confirmationChannel"), "核验渠道");
  if (!Object.values(ProjectOrderConfirmationChannel).includes(channelValue as ProjectOrderConfirmationChannel)) {
    throw new Error("核验渠道不正确");
  }
  const confirmationChannel = channelValue as ProjectOrderConfirmationChannel;
  const confirmationEvidenceRef = requiredText(formData.get("confirmationEvidenceRef"), "核验证据编号").slice(0, 200);
  const confirmationSummary = requiredText(formData.get("confirmationSummary"), "核验摘要").slice(0, 500);
  const confirmedAtText = requiredText(formData.get("confirmedAt"), "实际核验时间");
  const confirmedAt = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(confirmedAtText) ? confirmedAtText : `${confirmedAtText}Z`);
  if (!Number.isFinite(confirmedAt.getTime())) throw new Error("实际核验时间填写有误");
  if (confirmationEvidenceRef.length < 4) throw new Error("核验证据编号至少需要 4 个字符");
  if (confirmationSummary.length < 10) throw new Error("核验摘要至少需要 10 个字符，且不得填写完整联系方式等敏感信息");
  assertNoLimitedPreorderPaymentSolicitation(confirmationSummary, "用户可见核验摘要");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.projectOrder.findUnique({
          where: { id },
          select: {
            id: true,
            buyerId: true,
            title: true,
            quantity: true,
            createdAt: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            reservationExpiresAt: true,
            productSnapshot: true,
            updatedAt: true,
            preorderCampaignId: true,
            preorderCampaign: {
              select: {
                preorderStatus: true,
                preorderQualificationMode: true,
                preorderDeadline: true
              }
            },
            project: {
              select: {
                id: true,
                title: true,
                description: true,
                targetQuantity: true,
                estimatedBudget: true,
                workId: true,
                ownerUserId: true,
                createdById: true,
                designerAuthorizationStatus: true,
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
                presaleCampaign: {
                  select: {
                    id: true,
                    workId: true,
                    title: true,
                    description: true,
                    estimatedPrice: true,
                    priceNote: true,
                    sizeOptions: true,
                    colorOptions: true,
                    preorderStatus: true,
                    preorderQualificationMode: true,
                    preorderTargetQuantity: true,
                    preorderCapacity: true,
                    preorderDeadline: true,
                    preorderTermsVersion: true,
                    preorderTermsText: true,
                    preorderPaymentInstructions: true
                  }
                },
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
                products: { include: { skus: true } }
              }
            }
          }
        });
        if (!order || !order.preorderCampaignId || !order.preorderCampaign) {
          throw new Error("该记录不是 V2.3 限量预售订单意向");
        }
        if (order.preorderCampaign.preorderQualificationMode !== LimitedPreorderQualificationMode.CONFIRMED_ORDER) {
          throw new Error("只有不收款的人工确认订单意向可以使用本核验动作");
        }
        if (!([LimitedPreorderStatus.OPEN, LimitedPreorderStatus.PAUSED] as readonly LimitedPreorderStatus[]).includes(order.preorderCampaign.preorderStatus)) {
          throw new Error("活动不在开放或暂停核验阶段，不能新增合格订单意向");
        }
        if (!([ProjectOrderStatus.RESERVATION, ProjectOrderStatus.PENDING_PAYMENT] as readonly ProjectOrderStatus[]).includes(order.status)) {
          throw new Error("只有待核验的订单意向可以确认；已处理记录不能重复覆盖");
        }
        if (order.paymentStatus !== ProjectOrderPaymentStatus.UNPAID) {
          throw new Error("首期试点不收款，存在付款状态的记录不能按订单意向确认");
        }
        const now = new Date();
        const campaign = order.project.presaleCampaign;
        const authorization = order.project.designAuthorizations[0] ?? null;
        const authorizationSnapshot = readLimitedPreorderOfferSnapshot(authorization?.offerSnapshot);
        const verifiedAuthorizationOfferHash = authorizationSnapshot
          && authorization?.offerHash
          && hashLimitedPreorderOfferSnapshot(authorizationSnapshot) === authorization.offerHash
          ? authorization.offerHash
          : null;
        const currentOffer = campaign ? createLimitedPreorderOfferEnvelope({
          projectId: order.project.id,
          projectTitle: order.project.title,
          projectDescription: order.project.description,
          projectTargetQuantity: order.project.targetQuantity,
          projectEstimatedBudget: order.project.estimatedBudget,
          workTitle: order.project.work?.title ?? "",
          workDescription: order.project.work?.description ?? null,
          campaign,
          products: order.project.products,
          displayImageUrls: order.project.work?.images.map((image) => image.imageUrl) ?? [],
          now
        }) : null;
        const submissionOfferHash = readProjectOrderProductSnapshot(order.productSnapshot).submissionOfferHash;
        if (
          !campaign
          || campaign.id !== order.preorderCampaignId
          || !order.project.work
          || !isPublicQualityWork(order.project.work)
          || !currentOffer
          || submissionOfferHash !== currentOffer.hash
          || !hasCurrentLimitedPreorderAuthorization({
            campaignId: campaign.id,
            campaignWorkId: campaign.workId,
            projectWorkId: order.project.workId,
            workOwnerUserId: order.project.work.userId,
            projectOwnerUserId: order.project.ownerUserId ?? order.project.createdById,
            projectAuthorizationStatus: order.project.designerAuthorizationStatus,
            authorizationRecordStatus: authorization?.status ?? null,
            authorizationPreorderCampaignId: authorization?.preorderCampaignId ?? null,
            authorizationRecordWorkId: authorization?.workId ?? null,
            authorizationDesignerUserId: authorization?.designerUserId ?? null,
            authorizationOwnerUserId: authorization?.ownerUserId ?? null,
            authorizationTermsVersion: authorization?.termsVersion ?? null,
            authorizationOfferHash: verifiedAuthorizationOfferHash,
            currentOfferHash: currentOffer.hash
          })
        ) {
          throw new Error("该订单提交时的开售资料缺失或已变化，关联作品已下架、不再满足公开质量门槛，或当前作者授权已撤销、损坏、与开售资料不一致，不能新增合格订单意向；请暂停并核查后续处理");
        }
        if (confirmedAt < order.createdAt || confirmedAt > now) {
          throw new Error("实际核验时间必须在订单提交之后且不能晚于当前时间");
        }
        if (
          !order.preorderCampaign.preorderDeadline
          || order.preorderCampaign.preorderDeadline <= now
          || !order.reservationExpiresAt
          || order.reservationExpiresAt <= now
          || confirmedAt > order.preorderCampaign.preorderDeadline
          || confirmedAt > order.reservationExpiresAt
        ) {
          throw new Error("活动截止时间或名额锁定期已过，不能把该记录计入成团");
        }

        const changed = await tx.projectOrder.updateMany({
          where: {
            id,
            updatedAt: order.updatedAt,
            status: order.status,
            paymentStatus: ProjectOrderPaymentStatus.UNPAID,
            fulfillmentStatus: order.fulfillmentStatus,
            confirmedAt: null
          },
          data: {
            status: ProjectOrderStatus.CONFIRMED,
            confirmedAt,
            confirmedById: user.id,
            confirmationChannel,
            confirmationEvidenceRef,
            confirmationSummary,
            reservationExpiresAt: null
          }
        });
        if (changed.count !== 1) throw new Error("订单意向状态已变化，请刷新后重试");
        await tx.commerceStateEvent.create({
          data: {
            aggregateType: CommerceAggregateType.ORDER,
            aggregateId: id,
            fromState: order.status,
            toState: ProjectOrderStatus.CONFIRMED,
            actorId: user.id,
            reason: "LIMITED_PREORDER_ORDER_VERIFIED",
            metadata: {
              campaignId: order.preorderCampaignId,
              confirmationChannel,
              confirmationEvidenceRef,
              confirmedAt: confirmedAt.toISOString(),
              quantity: order.quantity
            }
          }
        });
        await tx.adminLog.create({
          data: {
            adminId: user.id,
            action: "LIMITED_PREORDER_ORDER_CONFIRM",
            targetType: "ProjectOrder",
            targetId: id,
            detail: {
              oldStatus: order.status,
              newStatus: ProjectOrderStatus.CONFIRMED,
              confirmationChannel,
              confirmationEvidenceRef,
              confirmationSummary,
              confirmedAt: confirmedAt.toISOString()
            }
          }
        });
        if (order.buyerId) {
          await tx.notification.create({
            data: {
              userId: order.buyerId,
              type: NotificationType.REQUEST_HANDLED,
              title: "预售订单意向已核验",
              content: `你提交的“${order.title}”${order.quantity} 件订单意向已由平台人工核验并计入当前成团口径。本批不收款。`,
              linkUrl: `/me/orders/${id}`
            }
          });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/preorders");
  revalidatePath("/me/orders");
  revalidatePath(`/me/orders/${id}`);
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
            },
            project: {
              select: {
                presaleCampaign: {
                  select: {
                    preorderStatus: true,
                    preorderTargetQuantity: true,
                    preorderCapacity: true,
                    preorderDeadline: true
                  }
                }
              }
            }
          }
        });
        if (!order) throw new Error("订单不存在");
        const managedProjectCampaign = order.project.presaleCampaign;
        if (
          !order.preorderCampaignId
          && managedProjectCampaign
          && managedProjectCampaign.preorderStatus !== LimitedPreorderStatus.CLOSED
          && (
            managedProjectCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
            || managedProjectCampaign.preorderTargetQuantity !== null
            || managedProjectCampaign.preorderCapacity !== null
            || managedProjectCampaign.preorderDeadline !== null
          )
        ) {
          throw new Error("该项目已进入 V2.3 限量预售管理，旧版旁路订单不能再修改");
        }

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
        if (
          order.preorderCampaignId
          && effectiveStatus === ProjectOrderStatus.CONFIRMED
          && order.status !== ProjectOrderStatus.CONFIRMED
        ) {
          throw new Error("V2.3 订单意向必须使用专用人工核验动作确认，通用状态表单不能计入成团");
        }
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
          if (order.preorderCampaign.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER) {
            if (note) assertNoLimitedPreorderPaymentSolicitation(note, "用户可见订单说明");
            if (trackingCompany) assertNoLimitedPreorderPaymentSolicitation(trackingCompany, "用户可见物流公司");
            if (trackingNumber) assertNoLimitedPreorderPaymentSolicitation(trackingNumber, "用户可见物流单号");
            if (effectiveStatus === ProjectOrderStatus.CANCELLED && effectiveStatusReason) {
              assertNoLimitedPreorderPaymentSolicitation(effectiveStatusReason, "用户可见取消说明");
            }
            const shippingActuallyStarted = order.preorderCampaign.preorderStatus === LimitedPreorderStatus.PRODUCTION
              && (
                ([ProjectOrderStatus.SHIPPED, ProjectOrderStatus.COMPLETED] as readonly ProjectOrderStatus[]).includes(effectiveStatus)
                || ([ProjectOrderFulfillmentStatus.SHIPPED, ProjectOrderFulfillmentStatus.DELIVERED] as readonly ProjectOrderFulfillmentStatus[]).includes(fulfillmentStatus)
              );
            if ((trackingCompany || trackingNumber) && !shippingActuallyStarted) {
              throw new Error("活动与订单尚未真实进入发货阶段，不能提前展示物流公司或单号");
            }
          }
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
