"use server";

import { revalidatePath } from "next/cache";
import {
  CaseStudyStatus,
  CollaborationProjectPriority,
  CollaborationProjectStatus,
  ProjectOrderStatus,
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
import { prisma } from "@/lib/prisma";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  return user;
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
    workId: requiredText(formData.get("workId"), "作品"),
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

  if (id) await prisma.collaborationProject.update({ where: { id }, data });
  else await prisma.collaborationProject.create({ data: { ...data, createdById: admin.id } });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/me/projects");
  revalidatePath("/admin/projects");
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

  if (id) await prisma.projectOrder.update({ where: { id }, data });
  else await prisma.projectOrder.create({ data });

  revalidatePath("/admin/project-orders");
  revalidatePath("/me/project-orders");
  revalidatePath("/projects");
}

export async function saveReview(formData: FormData) {
  const admin = await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const data = {
    reviewerId: optionalText(formData.get("reviewerId")) ?? admin.id,
    targetType: enumValue(formData.get("targetType"), Object.values(ReviewTargetType), ReviewTargetType.PROJECT),
    targetUserId: optionalText(formData.get("targetUserId")),
    providerId: optionalText(formData.get("providerId")),
    workId: optionalText(formData.get("workId")),
    projectId: optionalText(formData.get("projectId")),
    rating: Math.min(5, Math.max(1, Number.parseInt(optionalText(formData.get("rating")) ?? "5", 10) || 5)),
    content: optionalText(formData.get("content")),
    status: enumValue(formData.get("status"), [ReviewStatus.PENDING, ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN], ReviewStatus.PENDING)
  };

  if (id) await prisma.review.update({ where: { id }, data });
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
