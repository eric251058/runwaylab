"use server";

import { revalidatePath } from "next/cache";
import {
  CollaborationProjectStatus,
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
import {
  canDesignerRespondToAuthorization,
  canManageProject,
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
  const project = await prisma.collaborationProject.findUnique({
    where: { id: projectId },
    include: { work: { select: { id: true, userId: true, title: true } } }
  });

  if (!project || !canManageProject(user, project)) throw new Error("无权申请该项目的设计授权");
  if (!project.workId || !project.work) throw new Error("该项目尚未关联公开作品，不能申请设计授权");

  const termsVersion = optionalText(formData.get("termsVersion")) ?? "v1";
  const scope = optionalText(formData.get("scope")) ?? "围绕该作品推进打样、预售验证和合作沟通。";
  const ownerUserId = project.ownerUserId ?? user.id;
  const nextData = nextAuthorizationRequestData(termsVersion);

  const authorization = await prisma.projectDesignAuthorization.upsert({
    where: { projectId },
    create: {
      projectId,
      workId: project.workId,
      designerUserId: project.work.userId,
      ownerUserId,
      scope,
      royaltyDescription: optionalText(formData.get("royaltyDescription")),
      ...nextData
    },
    update: {
      ownerUserId,
      scope,
      royaltyDescription: optionalText(formData.get("royaltyDescription")),
      ...nextData
    }
  });

  await prisma.collaborationProject.update({
    where: { id: projectId },
    data: { designerAuthorizationStatus: ProjectDesignAuthorizationStatus.PENDING }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "PROJECT_DESIGN_AUTHORIZATION_REQUEST",
      targetType: "ProjectDesignAuthorization",
      targetId: authorization.id,
      detail: { projectId, status: authorization.status, termsVersion }
    }
  });

  await createNotificationSafe({
    recipientId: project.work.userId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.REQUEST_HANDLED,
    title: "新的设计授权请求",
    body: project.title + " 希望围绕《" + project.work.title + "》推进合作，请你独立核对授权范围与条款。",
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
  const authorization = await prisma.projectDesignAuthorization.findUnique({
    where: { projectId }
  });

  if (!authorization) throw new Error("授权记录不存在");
  if (ownerCannotRespondToAuthorization(user, authorization)) throw new Error("项目主理人不能代替设计师授权");
  if (!canDesignerRespondToAuthorization(user, authorization)) throw new Error("只有作品作者本人可以处理设计授权");

  const updated = await prisma.projectDesignAuthorization.update({
    where: { projectId },
    data: {
      status,
      acceptedAt: status === ProjectDesignAuthorizationStatus.ACCEPTED ? new Date() : null,
      revokedAt: null
    }
  });

  await prisma.collaborationProject.update({
    where: { id: projectId },
    data: {
      designerAuthorizationStatus: status,
      ...(status !== ProjectDesignAuthorizationStatus.ACCEPTED
        ? {
            status: {
              set: CollaborationProjectStatus.PLANNING
            }
          }
        : {})
    }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "PROJECT_DESIGN_AUTHORIZATION_RESPONSE",
      targetType: "ProjectDesignAuthorization",
      targetId: updated.id,
      detail: { projectId, status }
    }
  });

  await createNotificationSafe({
    recipientId: authorization.ownerUserId,
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
  const authorization = await prisma.projectDesignAuthorization.findUnique({ where: { projectId } });
  if (!authorization) throw new Error("授权记录不存在");
  if (!canDesignerRespondToAuthorization(user, authorization)) throw new Error("只有作品作者本人可以撤销设计授权");
  if (authorization.status !== ProjectDesignAuthorizationStatus.ACCEPTED) throw new Error("只有已接受的设计授权可以撤销");

  const updated = await prisma.projectDesignAuthorization.update({
    where: { projectId },
    data: { status: ProjectDesignAuthorizationStatus.REVOKED, revokedAt: new Date() }
  });

  await prisma.collaborationProject.update({
    where: { id: projectId },
    data: {
      designerAuthorizationStatus: ProjectDesignAuthorizationStatus.REVOKED,
      status: { set: CollaborationProjectStatus.PLANNING }
    }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "PROJECT_DESIGN_AUTHORIZATION_REVOKE",
      targetType: "ProjectDesignAuthorization",
      targetId: updated.id,
      detail: { projectId, status: updated.status }
    }
  });

  await createNotificationSafe({
    recipientId: authorization.ownerUserId,
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
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) throw new Error("限量预订功能尚未开放");
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");

  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("订单 ID 缺失");

  const status = enumValue(formData.get("status"), Object.values(ProjectOrderStatus), ProjectOrderStatus.RESERVATION);
  const fulfillmentStatus = enumValue(formData.get("fulfillmentStatus"), Object.values(ProjectOrderFulfillmentStatus), ProjectOrderFulfillmentStatus.NOT_STARTED);
  const order = await prisma.projectOrder.findUnique({
    where: { id },
    select: { paymentStatus: true }
  });
  if (!order) throw new Error("订单不存在");

  const requestedPaymentStatus = enumValue(formData.get("paymentStatus"), Object.values(ProjectOrderPaymentStatus), order.paymentStatus);
  const paymentReason = optionalText(formData.get("paymentReason"));
  const manualPaymentPilotEnabled = await isFeatureEnabled("feature.manual_payment_pilot");
  const paymentUpdate = resolveManualPaymentStatusUpdate({
    actor: { ...user, manualPaymentPilotEnabled },
    oldStatus: order.paymentStatus,
    requestedStatus: requestedPaymentStatus,
    reason: paymentReason
  });
  if (!paymentUpdate.ok) throw new Error(paymentUpdate.error);

  await prisma.projectOrder.update({
    where: { id },
    data: {
      status,
      paymentStatus: paymentUpdate.status,
      fulfillmentStatus,
      trackingCompany: optionalText(formData.get("trackingCompany")),
      trackingNumber: optionalText(formData.get("trackingNumber")),
      exceptionNote: optionalText(formData.get("exceptionNote")),
      note: optionalText(formData.get("note"))
    }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "PROJECT_ORDER_UPDATE",
      targetType: "ProjectOrder",
      targetId: id,
      detail: {
        status,
        fulfillmentStatus,
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

  revalidatePath("/admin/orders");
  revalidatePath("/admin/preorders");
}
