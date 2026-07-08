"use server";

import { revalidatePath } from "next/cache";
import {
  FabricStatus,
  ProviderApplicationStatus,
  ProviderStatus,
  ProviderType,
  ProviderWorkProposalStatus,
  ProviderWorkProposalType,
  RecommendationStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalText, requiredText, splitTags } from "@/lib/provider-market";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function applyProvider(formData: FormData) {
  await prisma.providerApplication.create({
    data: {
      providerType: (optionalText(formData.get("providerType")) ?? ProviderType.OTHER) as ProviderType,
      companyName: requiredText(formData.get("companyName"), "公司/工作室名称"),
      contactName: requiredText(formData.get("contactName"), "联系人"),
      phone: optionalText(formData.get("phone")),
      email: optionalText(formData.get("email")),
      wechat: optionalText(formData.get("wechat")),
      city: optionalText(formData.get("city")),
      description: optionalText(formData.get("description"))
    }
  });

  revalidatePath("/providers/apply");
}

export async function saveProvider(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const data = {
    name: requiredText(formData.get("name"), "服务商名称"),
    slug: optionalText(formData.get("slug")),
    type: (optionalText(formData.get("type")) ?? ProviderType.OTHER) as ProviderType,
    logoUrl: optionalText(formData.get("logoUrl")),
    coverUrl: optionalText(formData.get("coverUrl")),
    city: optionalText(formData.get("city")),
    province: optionalText(formData.get("province")),
    country: optionalText(formData.get("country")) ?? "China",
    description: optionalText(formData.get("description")),
    contactName: optionalText(formData.get("contactName")),
    contactPhone: optionalText(formData.get("contactPhone")),
    contactEmail: optionalText(formData.get("contactEmail")),
    wechat: optionalText(formData.get("wechat")),
    website: optionalText(formData.get("website")),
    tags: splitTags(formData.get("tags")),
    isVerified: boolValue(formData, "isVerified"),
    isFeatured: boolValue(formData, "isFeatured"),
    status: (optionalText(formData.get("status")) ?? ProviderStatus.PENDING) as ProviderStatus
  };

  if (id) await prisma.provider.update({ where: { id }, data });
  else await prisma.provider.create({ data });

  revalidatePath("/providers");
  revalidatePath("/admin/providers");
}

export async function reviewProviderApplication(formData: FormData) {
  await requireAdmin();
  const id = requiredText(formData.get("id"), "申请 ID");
  const status = (optionalText(formData.get("status")) ?? ProviderApplicationStatus.PENDING) as ProviderApplicationStatus;
  const reviewNote = optionalText(formData.get("reviewNote"));

  const application = await prisma.providerApplication.update({
    where: { id },
    data: { status, reviewNote }
  });

  if (status === ProviderApplicationStatus.APPROVED) {
    const exists = await prisma.provider.findFirst({
      where: {
        name: application.companyName,
        type: application.providerType
      },
      select: { id: true }
    });

    if (!exists) {
      await prisma.provider.create({
        data: {
          name: application.companyName,
          type: application.providerType,
          city: application.city,
          description: application.description,
          contactName: application.contactName,
          contactPhone: application.phone,
          contactEmail: application.email,
          wechat: application.wechat,
          status: ProviderStatus.ACTIVE,
          isVerified: true,
          tags: []
        }
      });
    }
  }

  revalidatePath("/admin/provider-applications");
  revalidatePath("/admin/providers");
}

export async function saveFabric(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const data = {
    name: requiredText(formData.get("name"), "面料名称"),
    slug: optionalText(formData.get("slug")),
    code: optionalText(formData.get("code")),
    providerId: optionalText(formData.get("providerId")),
    imageUrl: optionalText(formData.get("imageUrl")),
    composition: optionalText(formData.get("composition")),
    weight: optionalText(formData.get("weight")),
    width: optionalText(formData.get("width")),
    color: optionalText(formData.get("color")),
    texture: optionalText(formData.get("texture")),
    season: optionalText(formData.get("season")),
    usage: optionalText(formData.get("usage")),
    description: optionalText(formData.get("description")),
    priceNote: optionalText(formData.get("priceNote")),
    moqNote: optionalText(formData.get("moqNote")),
    tags: splitTags(formData.get("tags")),
    isFeatured: boolValue(formData, "isFeatured"),
    status: (optionalText(formData.get("status")) ?? FabricStatus.ACTIVE) as FabricStatus
  };

  if (id) await prisma.fabric.update({ where: { id }, data });
  else await prisma.fabric.create({ data });

  revalidatePath("/fabrics");
  revalidatePath("/admin/fabrics");
}

export async function saveWorkFabricRecommendation(formData: FormData) {
  await requireAdmin();
  const workId = requiredText(formData.get("workId"), "作品 ID");
  const fabricId = requiredText(formData.get("fabricId"), "面料 ID");
  const fabric = await prisma.fabric.findUnique({ where: { id: fabricId }, select: { providerId: true } });

  await prisma.workFabricRecommendation.upsert({
    where: { workId_fabricId: { workId, fabricId } },
    update: {
      providerId: optionalText(formData.get("providerId")) ?? fabric?.providerId ?? null,
      reason: optionalText(formData.get("reason")),
      recommendedBy: optionalText(formData.get("recommendedBy")) ?? "ADMIN",
      status: (optionalText(formData.get("status")) ?? RecommendationStatus.PENDING) as RecommendationStatus
    },
    create: {
      workId,
      fabricId,
      providerId: optionalText(formData.get("providerId")) ?? fabric?.providerId ?? null,
      reason: optionalText(formData.get("reason")),
      recommendedBy: optionalText(formData.get("recommendedBy")) ?? "ADMIN",
      status: (optionalText(formData.get("status")) ?? RecommendationStatus.PENDING) as RecommendationStatus
    }
  });

  revalidatePath("/works");
  revalidatePath("/admin/work-fabric-recommendations");
}

export async function saveProviderWorkProposal(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const data = {
    workId: requiredText(formData.get("workId"), "作品 ID"),
    providerId: requiredText(formData.get("providerId"), "服务商 ID"),
    type: (optionalText(formData.get("type")) ?? ProviderWorkProposalType.OTHER) as ProviderWorkProposalType,
    title: requiredText(formData.get("title"), "方案标题"),
    description: optionalText(formData.get("description")),
    estimatedPrice: optionalText(formData.get("estimatedPrice")),
    estimatedTime: optionalText(formData.get("estimatedTime")),
    moq: optionalText(formData.get("moq")),
    attachments: splitTags(formData.get("attachments")),
    status: (optionalText(formData.get("status")) ?? ProviderWorkProposalStatus.PENDING) as ProviderWorkProposalStatus
  };

  if (id) await prisma.providerWorkProposal.update({ where: { id }, data });
  else await prisma.providerWorkProposal.create({ data });

  revalidatePath("/works");
  revalidatePath("/me/incubation");
  revalidatePath("/admin/provider-proposals");
}
