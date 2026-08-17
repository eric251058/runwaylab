"use server";

import {
  CollaborationProjectStatus,
  LimitedPreorderStatus,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/guards";
import { requiredText } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

const OWNER_BOOTSTRAP_BLOCKED_PROJECT_STATUSES: readonly CollaborationProjectStatus[] = [
  CollaborationProjectStatus.PREORDER_OPEN,
  CollaborationProjectStatus.PRODUCTION,
  CollaborationProjectStatus.QUALITY_CHECK,
  CollaborationProjectStatus.SHIPPING,
  CollaborationProjectStatus.COMPLETED,
  CollaborationProjectStatus.CANCELLED
];

async function runProjectOwnerBootstrapTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2034"
        && attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("负责人登记发生并发冲突，请刷新后重试");
}

export async function assignCollaborationProjectOwner(formData: FormData) {
  const admin = await requireAdminUser();
  if (!admin) throw new Error("没有后台权限");

  const projectId = requiredText(formData.get("projectId"), "合作项目");
  const ownerUserId = requiredText(formData.get("ownerUserId"), "项目负责人");
  const reason = requiredText(formData.get("reason"), "登记依据").trim();
  if (formData.get("confirm") !== "yes") {
    throw new Error("请先确认已经核实真实负责人身份");
  }
  if (reason.length < 4 || reason.length > 500) {
    throw new Error("登记依据需为 4–500 个字符");
  }

  const result = await runProjectOwnerBootstrapTransaction(async (tx) => {
    const [project, owner, authorization, orderCount] = await Promise.all([
      tx.collaborationProject.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          ownerUserId: true,
          createdById: true,
          presaleCampaignId: true,
          updatedAt: true,
          presaleCampaign: {
            select: {
              id: true,
              preorderStatus: true
            }
          }
        }
      }),
      tx.user.findUnique({
        where: { id: ownerUserId },
        select: {
          id: true,
          nickname: true,
          role: true,
          status: true
        }
      }),
      tx.projectDesignAuthorization.findFirst({
        where: { projectId },
        select: { id: true, status: true }
      }),
      tx.projectOrder.count({ where: { projectId } })
    ]);

    if (!project) throw new Error("合作项目不存在");
    if (
      !owner
      || owner.status !== UserStatus.ACTIVE
      || owner.role === UserRole.ADMIN
    ) {
      throw new Error("负责人必须是当前可登录的非管理员账户");
    }

    if (project.ownerUserId === ownerUserId) {
      return {
        changed: false,
        slug: project.slug,
        ownerUserId: owner.id,
        projectTitle: project.title
      };
    }

    if (project.ownerUserId !== null || project.createdById !== null) {
      throw new Error("该项目已有负责人或创建人；本入口只用于一次性补登记，不能转移负责人");
    }
    if (OWNER_BOOTSTRAP_BLOCKED_PROJECT_STATUSES.includes(project.status)) {
      throw new Error("项目已进入接单、生产、履约或终态，不能补登记负责人");
    }
    if (
      project.presaleCampaign
      && project.presaleCampaign.preorderStatus !== LimitedPreorderStatus.NOT_STARTED
    ) {
      throw new Error("限量预售生命周期已经开始，不能补登记负责人");
    }
    if (authorization) {
      throw new Error("该项目已有作品授权记录，不能通过一次性入口重绑负责人");
    }
    if (orderCount > 0) {
      throw new Error("该项目已有订单记录，不能补登记负责人");
    }

    const updated = await tx.collaborationProject.updateMany({
      where: {
        id: project.id,
        status: project.status,
        ownerUserId: null,
        createdById: null,
        presaleCampaignId: project.presaleCampaignId,
        updatedAt: project.updatedAt
      },
      data: { ownerUserId }
    });
    if (updated.count !== 1) {
      throw new Error("项目负责人或生命周期状态已变化，请刷新后重试");
    }

    await tx.adminLog.create({
      data: {
        adminId: admin.id,
        action: "COLLABORATION_PROJECT_OWNER_BOOTSTRAP",
        targetType: "CollaborationProject",
        targetId: project.id,
        detail: {
          oldOwnerUserId: null,
          oldCreatedById: null,
          newOwnerUserId: owner.id,
          newOwnerNickname: owner.nickname,
          reason,
          projectStatus: project.status,
          campaignId: project.presaleCampaign?.id ?? null,
          preorderStatus: project.presaleCampaign?.preorderStatus ?? null,
          authorizationCreated: false,
          authorDecisionChanged: false
        }
      }
    });

    await tx.notification.create({
      data: {
        userId: owner.id,
        type: NotificationType.REQUEST_HANDLED,
        title: "你已被登记为项目负责人",
        content: "平台已核实并登记你为《" + project.title + "》的真实负责人。请由你本人前往设计授权中心发送标准邀请；平台没有代你发送，也没有代作品作者作出决定。",
        linkUrl: "/me/authorizations"
      }
    });

    return {
      changed: true,
      slug: project.slug,
      ownerUserId: owner.id,
      projectTitle: project.title
    };
  });

  revalidatePath("/admin/preorders/readiness");
  revalidatePath(`/admin/projects/${projectId}/preorder`);
  revalidatePath("/me/authorizations");
  revalidatePath(`/projects/${result.slug}`);
  return result;
}
