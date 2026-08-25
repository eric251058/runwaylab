"use server";

import { revalidatePath } from "next/cache";
import {
  CaseStudyStatus,
  CollaborationProjectPriority,
  CollaborationProjectStatus,
  LimitedPreorderStatus,
  Prisma,
  ProjectDesignAuthorizationStatus,
  ProjectOrderStatus,
  ProjectProductStatus,
  ReviewStatus,
  ReviewTargetType,
  VerificationStatus,
  VerificationType
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  boolValue,
  enumValue,
  optionalDate,
  optionalText,
  requiredText
} from "@/lib/commercial-collaboration";
import { isAdmin } from "@/lib/permissions";
import {
  canPrepareManagedLimitedPreorderProject,
  canSetProjectProductStatus,
  canTransitionProjectStatus
} from "@/lib/projects/rules";
import { assertLimitedPreorderOfferEditable } from "@/lib/projects/preorder-offer";
import { assertNoLimitedPreorderPaymentSolicitation } from "@/lib/projects/preorder-lifecycle";
import { prisma } from "@/lib/prisma";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  return user;
}

type LimitedPreorderCampaignGuard = {
  preorderStatus: LimitedPreorderStatus;
  preorderTargetQuantity: number | null;
  preorderCapacity: number | null;
  preorderDeadline: Date | null;
};

const LOCKED_LIMITED_PREORDER_STATUSES: readonly LimitedPreorderStatus[] = [
  LimitedPreorderStatus.OPEN,
  LimitedPreorderStatus.PAUSED,
  LimitedPreorderStatus.GOAL_REACHED,
  LimitedPreorderStatus.FAILED,
  LimitedPreorderStatus.PRODUCTION,
  LimitedPreorderStatus.CANCELLED
];

function isConfiguredLimitedPreorder(campaign: LimitedPreorderCampaignGuard | null | undefined) {
  return Boolean(campaign && (
    campaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
    || campaign.preorderTargetQuantity !== null
    || campaign.preorderCapacity !== null
    || campaign.preorderDeadline !== null
  ));
}

function isManagedLimitedPreorder(campaign: LimitedPreorderCampaignGuard | null | undefined) {
  return isConfiguredLimitedPreorder(campaign) && campaign?.preorderStatus !== LimitedPreorderStatus.CLOSED;
}

function isLimitedPreorderLifecycleLocked(campaign: LimitedPreorderCampaignGuard | null | undefined) {
  return Boolean(campaign && LOCKED_LIMITED_PREORDER_STATUSES.includes(campaign.preorderStatus));
}

async function runPreorderPreparationTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("预售准备数据并发冲突，请刷新后重试");
}

export async function submitVerificationRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  await prisma.verificationRequest.create({
    data: {
      userId: user.id,
      persona: user.persona,
      type: enumValue(formData.get("type"), Object.values(VerificationType), VerificationType.OTHER),
      realName: optionalText(formData.get("realName")),
      organizationName: optionalText(formData.get("organizationName")),
      roleTitle: optionalText(formData.get("roleTitle")),
      phone: optionalText(formData.get("phone")),
      email: optionalText(formData.get("email")),
      wechat: optionalText(formData.get("wechat")),
      city: optionalText(formData.get("city")),
      description: optionalText(formData.get("description")),
      proofUrl: optionalText(formData.get("proofUrl"))
    }
  });

  revalidatePath("/me/verification");
  revalidatePath("/admin/verifications");
}

export async function reviewVerificationRequest(formData: FormData) {
  const admin = await requireAdminUser();
  const id = requiredText(formData.get("id"), "认证申请 ID");
  const status = enumValue(formData.get("status"), Object.values(VerificationStatus), VerificationStatus.PENDING);

  await prisma.verificationRequest.update({
    where: { id },
    data: {
      status,
      reviewNote: optionalText(formData.get("reviewNote")),
      reviewedAt: new Date(),
      reviewedById: admin.id
    }
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/me/verification");
}

export async function saveCollaborationProject(formData: FormData) {
  const admin = await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const data = {
    title: requiredText(formData.get("title"), "项目标题"),
    slug: optionalText(formData.get("slug")),
    workId: optionalText(formData.get("workId")),
    designerId: optionalText(formData.get("designerId")),
    schoolId: optionalText(formData.get("schoolId")),
    teacherId: optionalText(formData.get("teacherId")),
    providerId: optionalText(formData.get("providerId")),
    fabricId: optionalText(formData.get("fabricId")),
    presaleCampaignId: optionalText(formData.get("presaleCampaignId")),
    description: optionalText(formData.get("description")),
    status: enumValue(formData.get("status"), Object.values(CollaborationProjectStatus), CollaborationProjectStatus.DRAFT),
    priority: enumValue(formData.get("priority"), Object.values(CollaborationProjectPriority), CollaborationProjectPriority.NORMAL),
    targetQuantity: optionalText(formData.get("targetQuantity")),
    estimatedBudget: optionalText(formData.get("estimatedBudget")),
    targetLaunchDate: optionalDate(formData.get("targetLaunchDate")),
    internalNote: optionalText(formData.get("internalNote"))
  };

  const existingProject = id
    ? await prisma.collaborationProject.findUnique({
        where: { id },
        select: {
          title: true,
          description: true,
          targetQuantity: true,
          estimatedBudget: true,
          workId: true,
          designerId: true,
          presaleCampaignId: true,
          designerAuthorizationStatus: true,
          status: true,
          updatedAt: true,
          presaleCampaign: {
            select: {
              id: true,
              preorderStatus: true,
              preorderTargetQuantity: true,
              preorderCapacity: true,
              preorderDeadline: true
            }
          },
          designAuthorizations: {
            select: { status: true, workId: true, designerUserId: true, preorderCampaignId: true },
            take: 1
          }
        }
      })
    : null;

  if (id && !existingProject) throw new Error("合作项目不存在");
  const campaignAssociationChanged = data.presaleCampaignId !== (existingProject?.presaleCampaignId ?? null);
  const canDetachClosedCampaign = Boolean(
    existingProject?.presaleCampaign?.preorderStatus === LimitedPreorderStatus.CLOSED
    && data.presaleCampaignId === null
  );
  if (campaignAssociationChanged && !canDetachClosedCampaign) {
    throw new Error("预售活动关联必须通过预售活动管理页的串行化关联流程修改，通用项目入口不可挂接或更换活动。");
  }
  const authorizationRecord = existingProject?.designAuthorizations[0];
  const offerVisibleFieldsChanged = Boolean(existingProject && (
    data.title !== existingProject.title
    || data.description !== existingProject.description
    || data.targetQuantity !== existingProject.targetQuantity
    || data.estimatedBudget !== existingProject.estimatedBudget
  ));
  if (existingProject && isManagedLimitedPreorder(existingProject.presaleCampaign)) {
    assertNoLimitedPreorderPaymentSolicitation(data.title, "项目标题");
    if (data.description) assertNoLimitedPreorderPaymentSolicitation(data.description, "项目说明");
    if (data.targetQuantity) assertNoLimitedPreorderPaymentSolicitation(data.targetQuantity, "项目目标数量");
    if (data.estimatedBudget) assertNoLimitedPreorderPaymentSolicitation(data.estimatedBudget, "项目预算");
  }
  const exactOfferAuthorization = authorizationRecord?.preorderCampaignId === existingProject?.presaleCampaign?.id
    ? authorizationRecord
    : null;
  if (offerVisibleFieldsChanged) assertLimitedPreorderOfferEditable(exactOfferAuthorization?.status);
  if (
    existingProject
    && data.workId !== existingProject.workId
    && (
      existingProject.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.ACCEPTED
      || (authorizationRecord
        && ([ProjectDesignAuthorizationStatus.PENDING, ProjectDesignAuthorizationStatus.ACCEPTED] as readonly ProjectDesignAuthorizationStatus[])
          .includes(authorizationRecord.status))
    )
  ) {
    throw new Error("项目已有待确认或已接受的设计授权，不能更换作品；请先由作品作者拒绝或撤销授权后再重新关联。");
  }

  if (!canTransitionProjectStatus(data.status, existingProject?.designerAuthorizationStatus ?? null)) {
    throw new Error("设计师尚未授权，不能进入预售准备或预售开放状态。");
  }
  if (
    isManagedLimitedPreorder(existingProject?.presaleCampaign)
    &&
    ([CollaborationProjectStatus.PREORDER_READY, CollaborationProjectStatus.PREORDER_OPEN, CollaborationProjectStatus.PRODUCTION] as readonly CollaborationProjectStatus[]).includes(data.status)
    && existingProject?.status !== data.status
  ) {
    throw new Error("V2.3 项目的预售准备、开放与进入生产必须通过限量预售生命周期工作台操作并保留专用审计。");
  }
  if (
    existingProject?.presaleCampaign?.preorderStatus === LimitedPreorderStatus.NOT_STARTED
    && existingProject.status !== data.status
    && (
      !canPrepareManagedLimitedPreorderProject(existingProject.status)
      || !canPrepareManagedLimitedPreorderProject(data.status)
    )
  ) {
    throw new Error("已关联 V2.3 活动的项目不能通过通用入口进入或退出生产、质检、发货、完成、取消等非准备阶段。");
  }
  if (existingProject && isLimitedPreorderLifecycleLocked(existingProject.presaleCampaign)) {
    if (
      data.presaleCampaignId !== existingProject.presaleCampaignId
      || data.workId !== existingProject.workId
      || data.designerId !== existingProject.designerId
    ) {
      throw new Error("限量预售活动未结束前不能更换活动、作品或设计师关联。");
    }
    const pausedAuthorizationRecovery = existingProject.presaleCampaign?.preorderStatus === LimitedPreorderStatus.PAUSED
      && existingProject.status === CollaborationProjectStatus.PLANNING
      && data.status === CollaborationProjectStatus.PREORDER_READY
      && existingProject.designerAuthorizationStatus === ProjectDesignAuthorizationStatus.ACCEPTED;
    if (data.status !== existingProject.status && !pausedAuthorizationRecovery) {
      throw new Error("限量预售开始后项目阶段必须通过生命周期工作台操作。");
    }
  }

  if (id && existingProject) {
    const updated = await prisma.collaborationProject.updateMany({
      where: {
        id,
        workId: existingProject.workId,
        designerId: existingProject.designerId,
        presaleCampaignId: existingProject.presaleCampaignId,
        status: existingProject.status,
        designerAuthorizationStatus: existingProject.designerAuthorizationStatus,
        updatedAt: existingProject.updatedAt,
        ...(offerVisibleFieldsChanged && existingProject.presaleCampaignId
          ? {
              designAuthorizations: {
                none: {
                  preorderCampaignId: existingProject.presaleCampaignId,
                  status: { in: [ProjectDesignAuthorizationStatus.PENDING, ProjectDesignAuthorizationStatus.ACCEPTED] }
                }
              }
            }
          : {})
      },
      data
    });
    if (updated.count !== 1) throw new Error("项目状态或关键关联已变化，请刷新后重试");
  } else {
    await prisma.collaborationProject.create({ data: { ...data, createdById: admin.id } });
  }

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/me/projects");
  revalidatePath("/admin/projects");
}

function integerValue(value: FormDataEntryValue | null, label: string, { min = 0, max = 10_000_000 }: { min?: number; max?: number } = {}) {
  const raw = optionalText(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${label}填写有误`);
  return parsed;
}

export async function saveProjectProduct(formData: FormData) {
  await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const projectId = requiredText(formData.get("projectId"), "承接项目");
  const status = enumValue(formData.get("status"), Object.values(ProjectProductStatus), ProjectProductStatus.DRAFT);
  const title = requiredText(formData.get("title"), "商品标题");
  if (title.length > 100) throw new Error("商品标题不能超过 100 个字符");
  const input = {
    title,
    description: optionalText(formData.get("description"))?.slice(0, 1000) ?? null,
    materialDescription: optionalText(formData.get("materialDescription"))?.slice(0, 500) ?? null,
    careInstructions: optionalText(formData.get("careInstructions"))?.slice(0, 500) ?? null,
    price: integerValue(formData.get("price"), "价格", { min: 0, max: 100_000_000 }) ?? 0,
    currency: enumValue(formData.get("currency"), ["CNY", "USD", "EUR"] as const, "CNY"),
    targetQuantity: integerValue(formData.get("targetQuantity"), "目标数量", { min: 1, max: 1_000_000 }),
    preorderLimit: integerValue(formData.get("preorderLimit"), "商品硬限量", { min: 1, max: 1_000_000 }),
    preorderDeadline: optionalDate(formData.get("preorderDeadline")),
    estimatedShipDate: optionalDate(formData.get("estimatedShipDate")),
    imageStage: optionalText(formData.get("imageStage"))?.slice(0, 80) ?? null,
    status
  };

  await runPreorderPreparationTransaction(async (tx) => {
    const project = await tx.collaborationProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        workId: true,
        status: true,
        designerAuthorizationStatus: true,
        presaleCampaign: {
          select: {
            id: true,
            preorderStatus: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true
          }
        },
        designAuthorizations: {
          select: { status: true, preorderCampaignId: true },
          take: 1
        }
      }
    });
    if (!project) throw new Error("承接项目不存在");
    const projectAuthorization = project.designAuthorizations[0] ?? null;
    if (
      project.presaleCampaign?.id
      && projectAuthorization?.preorderCampaignId === project.presaleCampaign.id
    ) {
      assertLimitedPreorderOfferEditable(projectAuthorization.status);
    }
    if (isLimitedPreorderLifecycleLocked(project.presaleCampaign)) {
      throw new Error("限量预售开始后商品资料与容量已锁定，请先完成当前活动。");
    }
    if (status === ProjectProductStatus.PREORDER_OPEN && isManagedLimitedPreorder(project.presaleCampaign)) {
      throw new Error("商品开放预订必须通过限量预售生命周期工作台操作。");
    }
    if (!canSetProjectProductStatus(
      project.status,
      status,
      project.designerAuthorizationStatus,
      isManagedLimitedPreorder(project.presaleCampaign)
    )) {
      throw new Error("商品状态与项目阶段或设计授权不匹配。");
    }

    const data = { ...input, projectId, workId: project.workId };
    if (!id) {
      await tx.projectProduct.create({ data });
      return;
    }

    const existing = await tx.projectProduct.findUnique({
      where: { id },
      select: {
        projectId: true,
        workId: true,
        status: true,
        preorderCampaignId: true,
        updatedAt: true,
        preorderCampaign: {
          select: {
            preorderStatus: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true
          }
        }
      }
    });
    if (!existing || existing.projectId !== projectId) throw new Error("商品不属于该承接项目");
    if (isLimitedPreorderLifecycleLocked(existing.preorderCampaign)) {
      throw new Error("限量预售开始后商品资料与容量已锁定，请先完成当前活动。");
    }
    const updated = await tx.projectProduct.updateMany({
      where: {
        id,
        projectId: existing.projectId,
        workId: existing.workId,
        status: existing.status,
        preorderCampaignId: existing.preorderCampaignId,
        updatedAt: existing.updatedAt
      },
      data
    });
    if (updated.count !== 1) throw new Error("商品状态或活动归属已变化，请刷新后重试");
  });

  revalidatePath(`/admin/projects/${projectId}/preorder`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/admin/presale-campaigns");
}

export async function saveProjectSku(formData: FormData) {
  await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const projectId = requiredText(formData.get("projectId"), "承接项目");
  const productId = requiredText(formData.get("productId"), "商品");
  const enabled = formData.get("enabled") === "on";
  const capacity = integerValue(formData.get("capacity"), "SKU 容量", { min: 1, max: 1_000_000 });
  if (enabled && capacity === null) throw new Error("启用的 SKU 必须设置容量");
  const input = {
    productId,
    size: requiredText(formData.get("size"), "尺码").slice(0, 80),
    color: requiredText(formData.get("color"), "颜色").slice(0, 80),
    skuCode: optionalText(formData.get("skuCode"))?.slice(0, 80) ?? null,
    priceOverride: integerValue(formData.get("priceOverride"), "SKU 价格", { min: 1, max: 100_000_000 }),
    capacity,
    enabled
  };

  await runPreorderPreparationTransaction(async (tx) => {
    const product = await tx.projectProduct.findUnique({
      where: { id: productId },
      select: {
        projectId: true,
        status: true,
        preorderCampaignId: true,
        updatedAt: true,
        preorderCampaign: {
          select: {
            preorderStatus: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true
          }
        },
        project: {
          select: {
            designAuthorizations: {
              select: { status: true, preorderCampaignId: true },
              take: 1
            },
            presaleCampaign: {
              select: {
                id: true,
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
    if (!product || product.projectId !== projectId) throw new Error("SKU 不属于该承接项目商品");
    const projectAuthorization = product.project.designAuthorizations[0] ?? null;
    if (
      product.project.presaleCampaign?.id
      && projectAuthorization?.preorderCampaignId === product.project.presaleCampaign.id
    ) {
      assertLimitedPreorderOfferEditable(projectAuthorization.status);
    }
    if (
      isLimitedPreorderLifecycleLocked(product.project.presaleCampaign)
      || isLimitedPreorderLifecycleLocked(product.preorderCampaign)
    ) {
      throw new Error("限量预售开始后 SKU 与容量已锁定，请先完成当前活动。");
    }

    if (!id) {
      await tx.projectSku.create({ data: input });
      return;
    }

    const existing = await tx.projectSku.findUnique({
      where: { id },
      select: { productId: true, updatedAt: true }
    });
    if (!existing || existing.productId !== productId) throw new Error("SKU 不属于该商品");
    const updated = await tx.projectSku.updateMany({
      where: {
        id,
        productId: existing.productId,
        updatedAt: existing.updatedAt,
        product: {
          is: {
            projectId: product.projectId,
            status: product.status,
            preorderCampaignId: product.preorderCampaignId,
            updatedAt: product.updatedAt
          }
        }
      },
      data: input
    });
    if (updated.count !== 1) throw new Error("SKU 状态或商品归属已变化，请刷新后重试");
  });

  revalidatePath(`/admin/projects/${projectId}/preorder`);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveProjectOrder(formData: FormData) {
  await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const data = {
    projectId: requiredText(formData.get("projectId"), "合作项目"),
    workId: optionalText(formData.get("workId")),
    buyerId: optionalText(formData.get("buyerId")),
    providerId: optionalText(formData.get("providerId")),
    title: requiredText(formData.get("title"), "项目意向标题"),
    quantityNote: optionalText(formData.get("quantityNote")),
    amountNote: optionalText(formData.get("amountNote")),
    deliveryNote: optionalText(formData.get("deliveryNote")),
    status: enumValue(formData.get("status"), Object.values(ProjectOrderStatus), ProjectOrderStatus.INTENT),
    note: optionalText(formData.get("note"))
  };

  await runPreorderPreparationTransaction(async (tx) => {
    const project = await tx.collaborationProject.findUnique({
      where: { id: data.projectId },
      select: {
        id: true,
        presaleCampaign: {
          select: {
            preorderStatus: true,
            preorderTargetQuantity: true,
            preorderCapacity: true,
            preorderDeadline: true
          }
        }
      }
    });
    if (!project) throw new Error("合作项目不存在");
    if (isManagedLimitedPreorder(project.presaleCampaign)) {
      throw new Error("该项目已进入 V2.3 限量预售管理，不能再创建或修改未关联活动的旧版项目意向。");
    }

    if (id) {
      const existing = await tx.projectOrder.findUnique({
        where: { id },
        select: { projectId: true, preorderCampaignId: true, updatedAt: true }
      });
      if (!existing) throw new Error("项目意向不存在");
      if (existing.preorderCampaignId) {
        throw new Error("V2.3 限量预售订单必须通过订单管理页处理，旧项目意向入口不可修改。");
      }
      if (existing.projectId !== data.projectId) throw new Error("项目意向不能更换所属合作项目");
      const changed = await tx.projectOrder.updateMany({
        where: { id, projectId: existing.projectId, preorderCampaignId: null, updatedAt: existing.updatedAt },
        data
      });
      if (changed.count !== 1) throw new Error("项目意向已变化，请刷新后重试");
    } else {
      await tx.projectOrder.create({ data });
    }
  });

  revalidatePath("/admin/project-orders");
  revalidatePath("/me/project-orders");
  revalidatePath("/projects");
}

export async function saveReview(formData: FormData) {
  const admin = await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const status = enumValue(formData.get("status"), [ReviewStatus.PENDING, ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN], ReviewStatus.PENDING);
  const existing = id
    ? await prisma.review.findUnique({ where: { id }, select: { orderId: true } })
    : null;
  const data = {
    reviewerId: optionalText(formData.get("reviewerId")) ?? admin.id,
    targetType: enumValue(formData.get("targetType"), Object.values(ReviewTargetType), ReviewTargetType.PROJECT),
    targetUserId: optionalText(formData.get("targetUserId")),
    providerId: optionalText(formData.get("providerId")),
    workId: optionalText(formData.get("workId")),
    projectId: optionalText(formData.get("projectId")),
    rating: Math.min(5, Math.max(1, Number.parseInt(optionalText(formData.get("rating")) ?? "5", 10) || 5)),
    content: optionalText(formData.get("content")),
    status
  };

  if (id && existing?.orderId) {
    // Verified transaction reviews are user-authored. Admins may moderate visibility, not rewrite reputation.
    await prisma.review.update({ where: { id }, data: { status } });
  } else if (id) await prisma.review.update({ where: { id }, data });
  else await prisma.review.create({ data });

  revalidatePath("/admin/reviews");
  revalidatePath("/providers");
  revalidatePath("/projects");
}

export async function saveCaseStudy(formData: FormData) {
  await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const data = {
    title: requiredText(formData.get("title"), "案例标题"),
    slug: requiredText(formData.get("slug"), "slug"),
    coverUrl: optionalText(formData.get("coverUrl")),
    summary: optionalText(formData.get("summary")),
    content: optionalText(formData.get("content")),
    workId: optionalText(formData.get("workId")),
    projectId: optionalText(formData.get("projectId")),
    schoolId: optionalText(formData.get("schoolId")),
    teacherId: optionalText(formData.get("teacherId")),
    providerId: optionalText(formData.get("providerId")),
    designerName: optionalText(formData.get("designerName")),
    resultNote: optionalText(formData.get("resultNote")),
    isFeatured: boolValue(formData, "isFeatured"),
    status: enumValue(formData.get("status"), Object.values(CaseStudyStatus), CaseStudyStatus.DRAFT)
  };

  if (id) await prisma.caseStudy.update({ where: { id }, data });
  else await prisma.caseStudy.create({ data });

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/admin/cases");
}
