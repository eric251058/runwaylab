"use server";

import { ProjectApplicationRole, ProjectApplicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { publicProjectWhere } from "@/lib/commercial-collaboration";
import { createNotificationSafe, NOTIFICATION_EVENTS, safeNotificationSummary } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { PROJECT_APPLICATION_ROLE_LABELS, PROJECT_APPLICATION_ROLES } from "@/lib/project-applications";

function textValue(value: FormDataEntryValue | null, label: string, max: number, min = 1) {
  const valueText = String(value ?? "").trim();
  if (valueText.length < min) throw new Error(label + "至少需要 " + min + " 个字符");
  if (valueText.length > max) throw new Error(label + "不能超过 " + max + " 个字符");
  return valueText;
}

async function requireActiveUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("请先登录有效账号");
  return user;
}

function parseRole(value: FormDataEntryValue | null) {
  const role = String(value ?? "") as ProjectApplicationRole;
  if (!PROJECT_APPLICATION_ROLES.includes(role)) throw new Error("请选择有效的合作角色");
  return role;
}

function refreshProjectApplicationPages(projectId: string) {
  revalidatePath("/projects");
  revalidatePath("/projects/" + projectId);
  revalidatePath("/me");
  revalidatePath("/me/project-applications");
}

export async function submitProjectApplication(formData: FormData) {
  const user = await requireActiveUser();
  const projectId = textValue(formData.get("projectId"), "项目", 64);
  const role = parseRole(formData.get("role"));
  const message = textValue(formData.get("message"), "合作说明", 500, 10);
  const experienceRaw = String(formData.get("experience") ?? "").trim();
  if (experienceRaw.length > 500) throw new Error("相关经验不能超过 500 个字符");

  const project = await prisma.collaborationProject.findFirst({
    where: { AND: [{ id: projectId }, publicProjectWhere()] },
    select: {
      id: true,
      title: true,
      slug: true,
      designerId: true,
      ownerUserId: true,
      createdById: true,
      applicationDeadline: true,
      work: { select: { userId: true } }
    }
  });
  if (!project) throw new Error("项目不存在或暂不开放申请");
  if (project.applicationDeadline && project.applicationDeadline < new Date()) throw new Error("项目申请已截止");
  if ([project.designerId, project.ownerUserId, project.createdById, project.work?.userId].includes(user.id)) {
    throw new Error("项目发起方无需重复申请");
  }

  const previous = await prisma.projectApplication.findUnique({
    where: { projectId_applicantId_role: { projectId, applicantId: user.id, role } },
    select: { status: true }
  });
  if (previous?.status === ProjectApplicationStatus.ACCEPTED) throw new Error("你已通过该角色的参与申请");

  await prisma.projectApplication.upsert({
    where: { projectId_applicantId_role: { projectId, applicantId: user.id, role } },
    create: { projectId, applicantId: user.id, role, message, experience: experienceRaw || null },
    update: {
      message,
      experience: experienceRaw || null,
      status: ProjectApplicationStatus.PENDING,
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null
    }
  });

  const recipientId = project.ownerUserId ?? project.createdById ?? project.designerId ?? project.work?.userId;
  await createNotificationSafe({
    recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROJECT_APPLICATION_RECEIVED,
    title: "项目收到新的参与申请",
    body: PROJECT_APPLICATION_ROLE_LABELS[role] + "：" + safeNotificationSummary(message),
    targetUrl: "/me/project-applications"
  });
  refreshProjectApplicationPages(project.id);
}

export async function withdrawProjectApplication(formData: FormData) {
  const user = await requireActiveUser();
  const applicationId = textValue(formData.get("applicationId"), "申请", 64);
  const result = await prisma.projectApplication.updateMany({
    where: { id: applicationId, applicantId: user.id, status: ProjectApplicationStatus.PENDING },
    data: { status: ProjectApplicationStatus.WITHDRAWN }
  });
  if (!result.count) throw new Error("申请不存在或当前状态不能撤回");
  const application = await prisma.projectApplication.findUnique({
    where: { id: applicationId },
    select: { projectId: true }
  });
  if (application) refreshProjectApplicationPages(application.projectId);
}

export async function reviewProjectApplication(formData: FormData) {
  const user = await requireActiveUser();
  const applicationId = textValue(formData.get("applicationId"), "申请", 64);
  const decision = String(formData.get("decision") ?? "") as ProjectApplicationStatus;
  if (decision !== ProjectApplicationStatus.ACCEPTED && decision !== ProjectApplicationStatus.REJECTED) {
    throw new Error("审核决定无效");
  }
  const reviewNoteRaw = String(formData.get("reviewNote") ?? "").trim();
  if (reviewNoteRaw.length > 300) throw new Error("审核说明不能超过 300 个字符");

  const application = await prisma.projectApplication.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          ownerUserId: true,
          createdById: true,
          designerId: true,
          workspaceId: true,
          workspace: {
            select: {
              ownerId: true,
              members: {
                where: { userId: user.id, status: "ACTIVE" },
                select: { role: true },
                take: 1
              }
            }
          }
        }
      }
    }
  });
  if (!application || application.status !== ProjectApplicationStatus.PENDING) {
    throw new Error("申请不存在或已经处理");
  }
  const workspaceAccess = application.project.workspace?.members[0];
  const canReview =
    user.role === "ADMIN" ||
    application.project.ownerUserId === user.id ||
    application.project.createdById === user.id ||
    application.project.designerId === user.id ||
    application.project.workspace?.ownerId === user.id ||
    workspaceAccess?.role === "OWNER" ||
    workspaceAccess?.role === "ADMIN";
  if (!canReview) throw new Error("你没有审核该项目申请的权限");

  await prisma.$transaction(async (tx) => {
    const reviewed = await tx.projectApplication.updateMany({
      where: { id: application.id, status: ProjectApplicationStatus.PENDING },
      data: {
        status: decision,
        reviewNote: reviewNoteRaw || null,
        reviewedAt: new Date(),
        reviewedById: user.id
      }
    });
    if (!reviewed.count) throw new Error("申请已经由其他项目负责人处理");
    if (decision === ProjectApplicationStatus.ACCEPTED && application.project.workspaceId) {
      await tx.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: application.project.workspaceId, userId: application.applicantId } },
        create: {
          workspaceId: application.project.workspaceId,
          userId: application.applicantId,
          role: "MEMBER",
          status: "ACTIVE"
        },
        update: { status: "ACTIVE" }
      });
    }
  });

  await createNotificationSafe({
    recipientId: application.applicantId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROJECT_APPLICATION_UPDATED,
    title: decision === ProjectApplicationStatus.ACCEPTED ? "项目参与申请已通过" : "项目参与申请已有结果",
    body:
      decision === ProjectApplicationStatus.ACCEPTED
        ? "你已被接纳参与「" + application.project.title + "」" + (application.project.workspaceId ? "，项目工作区已为你开放。" : "。")
        : "「" + application.project.title + "」本次暂未接纳你的申请。",
    targetUrl: "/me/project-applications"
  });
  refreshProjectApplicationPages(application.project.id);
}
