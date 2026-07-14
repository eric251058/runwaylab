"use server";

import { revalidatePath } from "next/cache";
import {
  FabricStatus,
  ProviderAvailabilityStatus,
  ProviderCapacityStatus,
  ProviderApplicationStatus,
  ProviderOrderPreference,
  ProviderStatus,
  ProviderType,
  ProviderWorkProposalStatus,
  ProviderWorkProposalType,
  RecommendationStatus
} from "@prisma/client";
import { z } from "zod";
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

function optionalInt(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function fabricCatalogStatus(value: FormDataEntryValue | null) {
  const status = optionalText(value);
  return status === FabricStatus.INACTIVE || status === FabricStatus.ARCHIVED ? status : FabricStatus.ACTIVE;
}

const supplyProviderTypeSchema = z.nativeEnum(ProviderType).refine((value) => value !== ProviderType.BUYER, {
  message: "本轮仅支持面料商、打样工作室、服装工厂和专业服务"
});

const providerApplicationSchema = z.object({
  providerType: supplyProviderTypeSchema.default(ProviderType.OTHER),
  companyName: z.string().trim().min(1, "公司/工作室名称不能为空").max(100),
  contactName: z.string().trim().min(1, "联系人不能为空").max(60),
  phone: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  wechat: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable()
});

export async function applyProvider(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录后再提交服务商入驻申请");

  const parsed = providerApplicationSchema.safeParse({
    providerType: optionalText(formData.get("providerType")) ?? ProviderType.OTHER,
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    wechat: formData.get("wechat"),
    city: formData.get("city"),
    description: formData.get("description")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "请检查入驻申请信息");
  }

  await prisma.providerApplication.create({
    data: {
      userId: user.id,
      providerType: parsed.data.providerType,
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || user.email,
      wechat: parsed.data.wechat || null,
      city: parsed.data.city || null,
      description: parsed.data.description || null
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
    tagline: optionalText(formData.get("tagline")),
    city: optionalText(formData.get("city")),
    province: optionalText(formData.get("province")),
    country: optionalText(formData.get("country")) ?? "China",
    description: optionalText(formData.get("description")),
    contactName: optionalText(formData.get("contactName")),
    contactPhone: optionalText(formData.get("contactPhone")),
    contactEmail: optionalText(formData.get("contactEmail")),
    wechat: optionalText(formData.get("wechat")),
    whatsapp: optionalText(formData.get("whatsapp")),
    website: optionalText(formData.get("website")),
    tags: splitTags(formData.get("tags")),
    specialties: splitTags(formData.get("specialties")),
    categories: splitTags(formData.get("categories")),
    materials: splitTags(formData.get("materials")),
    techniques: splitTags(formData.get("techniques")),
    serviceRegions: splitTags(formData.get("serviceRegions")),
    isVerified: boolValue(formData, "isVerified"),
    isFeatured: boolValue(formData, "isFeatured"),
    status: (optionalText(formData.get("status")) ?? ProviderStatus.PENDING) as ProviderStatus,
    orderPreference: (optionalText(formData.get("orderPreference")) ?? ProviderOrderPreference.FLEXIBLE) as ProviderOrderPreference,
    minimumOrderQuantity: optionalInt(formData.get("minimumOrderQuantity")),
    maximumOrderQuantity: optionalInt(formData.get("maximumOrderQuantity")),
    moqMin: optionalInt(formData.get("moqMin")),
    acceptsSampling: boolValue(formData, "acceptsSampling"),
    acceptsSmallBatch: boolValue(formData, "acceptsSmallBatch"),
    acceptsLargeOrder: boolValue(formData, "acceptsLargeOrder"),
    sampleLeadDays: optionalInt(formData.get("sampleLeadDays")),
    productionLeadDays: optionalInt(formData.get("productionLeadDays")),
    capacityText: optionalText(formData.get("capacityText")),
    capacityStatus: (optionalText(formData.get("capacityStatus")) ?? ProviderCapacityStatus.UNKNOWN) as ProviderCapacityStatus,
    availabilityStatus: (optionalText(formData.get("availabilityStatus")) ?? ProviderAvailabilityStatus.OPEN) as ProviderAvailabilityStatus,
    supportedCategories: optionalText(formData.get("supportedCategories")),
    preferredMaterials: optionalText(formData.get("preferredMaterials")),
    preferredRegions: optionalText(formData.get("preferredRegions")),
    opportunityVisible: boolValue(formData, "opportunityVisible"),
    publicContactEnabled: boolValue(formData, "publicContactEnabled")
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
          ownerId: application.userId,
          type: application.providerType,
          city: application.city,
          description: application.description,
          contactName: application.contactName,
          contactPhone: application.phone,
          contactEmail: application.email,
          wechat: application.wechat,
          status: ProviderStatus.ACTIVE,
          isVerified: true,
          opportunityVisible: true,
          tags: []
        }
      });
    } else if (application.userId) {
      await prisma.provider.update({
        where: { id: exists.id },
        data: {
          ownerId: application.userId,
          contactEmail: application.email ?? undefined,
          status: ProviderStatus.ACTIVE
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
    imageUrls: splitTags(formData.get("imageUrls")),
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
    status: fabricCatalogStatus(formData.get("status"))
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
