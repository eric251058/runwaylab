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
  Prisma,
  RecommendationStatus
} from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { normalizeProviderEmail } from "@/lib/provider-duplicates";
import { optionalText, requiredText, splitTags } from "@/lib/provider-market";
import {
  ONBOARDING_PROVIDER_TYPES,
  isOnboardingProviderType,
  parseMoq,
  parsePositiveDays
} from "@/lib/provider-onboarding";

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

function enumValue<T extends string>(values: readonly T[], value: FormDataEntryValue | null, fallback: T) {
  const text = optionalText(value);
  return text && values.includes(text as T) ? (text as T) : fallback;
}

function fabricCatalogStatus(value: FormDataEntryValue | null) {
  const status = optionalText(value);
  return status === FabricStatus.INACTIVE || status === FabricStatus.ARCHIVED ? status : FabricStatus.ACTIVE;
}

const providerApplicationSchema = z.object({
  providerType: z.enum(ONBOARDING_PROVIDER_TYPES),
  companyName: z.string().trim().min(1, "公司/工作室名称不能为空").max(100),
  contactName: z.string().trim().min(1, "联系人不能为空").max(60),
  phone: z.string().trim().min(1, "联系电话不能为空").max(80),
  email: z.string().trim().max(120).optional().nullable(),
  wechat: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().min(1, "所在城市不能为空").max(60),
  address: z.string().trim().max(160).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  serviceArea: z.string().trim().max(120).optional().nullable(),
  responseTime: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(120, "一句话介绍最多 120 个字").optional().nullable(),
  patternMaking: z.string().trim().max(40).optional().nullable(),
  sampleSupported: z.boolean().optional().nullable(),
  singleSampleSupported: z.boolean().optional().nullable(),
  smallOrderSupported: z.boolean().optional().nullable(),
  minimumOrder: z.string().trim().max(80).optional().nullable(),
  leadTime: z.string().trim().max(80).optional().nullable(),
  priceRange: z.string().trim().max(120).optional().nullable(),
  monthlyCapacity: z.string().trim().max(120).optional().nullable(),
  qualityControl: z.string().trim().max(500).optional().nullable()
});

function splitFormList(formData: FormData, key: string, limit = 12) {
  const values = formData.getAll(key).flatMap((item) => (typeof item === "string" ? splitTags(item) : []));
  return [...new Set(values)].slice(0, limit);
}

function booleanFromForm(formData: FormData, key: string) {
  const value = optionalText(formData.get(key));
  if (value === "true" || value === "yes" || value === "on") return true;
  if (value === "false" || value === "no") return false;
  return null;
}

export async function applyProvider(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录后再提交服务商入驻申请");

  if (formData.get("acceptRules") !== "on") {
    throw new Error("请先确认接受平台合作规则。");
  }

  const providerType = optionalText(formData.get("providerType"));
  if (!isOnboardingProviderType(providerType)) {
    throw new Error("请选择正确的服务商类型。");
  }

  const parsed = providerApplicationSchema.safeParse({
    providerType,
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    wechat: formData.get("wechat"),
    city: formData.get("city"),
    address: formData.get("address"),
    logoUrl: formData.get("logoUrl"),
    serviceArea: formData.get("serviceArea"),
    responseTime: formData.get("responseTime"),
    description: formData.get("description"),
    patternMaking: formData.get("patternMaking"),
    sampleSupported: booleanFromForm(formData, "sampleSupported"),
    singleSampleSupported: booleanFromForm(formData, "singleSampleSupported"),
    smallOrderSupported: booleanFromForm(formData, "smallOrderSupported"),
    minimumOrder: formData.get("minimumOrder"),
    leadTime: formData.get("leadTime"),
    priceRange: formData.get("priceRange"),
    monthlyCapacity: formData.get("monthlyCapacity"),
    qualityControl: formData.get("qualityControl")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "请检查入驻申请信息");
  }

  const applicationEmail = normalizeProviderEmail(parsed.data.email) ?? normalizeProviderEmail(user.email);
  const providerOwnerConditions: Prisma.ProviderWhereInput[] = [{ ownerId: user.id }];
  if (applicationEmail) {
    providerOwnerConditions.push({ contactEmail: { equals: applicationEmail, mode: Prisma.QueryMode.insensitive } });
  }

  const [existingApplication, existingProvider] = await Promise.all([
    prisma.providerApplication.findFirst({
      where: {
        userId: user.id,
        status: ProviderApplicationStatus.PENDING
      },
      select: { id: true, providerType: true }
    }),
    prisma.provider.findFirst({
      where: {
        OR: providerOwnerConditions
      },
      select: { id: true, type: true, status: true }
    })
  ]);

  if (existingProvider) {
    if (existingProvider.type === parsed.data.providerType) {
      throw new Error("当前账号已经有同类型服务商资料，请进入服务商工作台维护。");
    }
    throw new Error("当前版本暂不支持一个账号同时入驻多种服务商类型，请联系平台处理类型变更。");
  }

  if (existingApplication) {
    throw new Error("你已有入驻申请正在审核中，请等待平台处理。");
  }

  const specialties = splitFormList(formData, "specialties");
  const categories = splitFormList(formData, "categories");
  const providerDetails = {
    providerType: parsed.data.providerType,
    specialties,
    categories,
    serviceArea: parsed.data.serviceArea || null,
    responseTime: parsed.data.responseTime || null,
    patternMaking: parsed.data.patternMaking || null,
    sampleSupported: parsed.data.sampleSupported,
    singleSampleSupported: parsed.data.singleSampleSupported,
    smallOrderSupported: parsed.data.smallOrderSupported,
    minimumOrder: parsed.data.minimumOrder || null,
    leadTime: parsed.data.leadTime || null,
    priceRange: parsed.data.priceRange || null,
    monthlyCapacity: parsed.data.monthlyCapacity || null,
    qualityControl: parsed.data.qualityControl || null
  };

  await prisma.providerApplication.create({
    data: {
      userId: user.id,
      providerType: parsed.data.providerType,
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      phone: parsed.data.phone,
      email: applicationEmail,
      wechat: parsed.data.wechat || null,
      city: parsed.data.city,
      address: parsed.data.address || null,
      logoUrl: parsed.data.logoUrl || null,
      serviceArea: parsed.data.serviceArea || null,
      responseTime: parsed.data.responseTime || null,
      specialties,
      categories,
      patternMaking: parsed.data.patternMaking || null,
      sampleSupported: parsed.data.sampleSupported,
      singleSampleSupported: parsed.data.singleSampleSupported,
      smallOrderSupported: parsed.data.smallOrderSupported,
      minimumOrder: parsed.data.minimumOrder || null,
      leadTime: parsed.data.leadTime || null,
      priceRange: parsed.data.priceRange || null,
      monthlyCapacity: parsed.data.monthlyCapacity || null,
      qualityControl: parsed.data.qualityControl || null,
      providerDetails,
      description: parsed.data.description
    }
  });

  revalidatePath("/providers/apply");
}

export async function saveProvider(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const contactEmail = normalizeProviderEmail(optionalText(formData.get("contactEmail")));
  const data = {
    name: requiredText(formData.get("name"), "服务商名称"),
    slug: optionalText(formData.get("slug")),
    type: enumValue(Object.values(ProviderType), formData.get("type"), ProviderType.OTHER),
    logoUrl: optionalText(formData.get("logoUrl")),
    coverUrl: optionalText(formData.get("coverUrl")),
    tagline: optionalText(formData.get("tagline")),
    city: optionalText(formData.get("city")),
    address: optionalText(formData.get("address")),
    province: optionalText(formData.get("province")),
    country: optionalText(formData.get("country")) ?? "China",
    description: optionalText(formData.get("description")),
    contactName: optionalText(formData.get("contactName")),
    contactPhone: optionalText(formData.get("contactPhone")),
    contactEmail,
    wechat: optionalText(formData.get("wechat")),
    whatsapp: optionalText(formData.get("whatsapp")),
    website: optionalText(formData.get("website")),
    tags: splitTags(formData.get("tags")),
    specialties: splitTags(formData.get("specialties")),
    categories: splitTags(formData.get("categories")),
    materials: splitTags(formData.get("materials")),
    techniques: splitTags(formData.get("techniques")),
    serviceRegions: splitTags(formData.get("serviceRegions")),
    serviceArea: optionalText(formData.get("serviceArea")),
    responseTime: optionalText(formData.get("responseTime")),
    isVerified: boolValue(formData, "isVerified"),
    isFeatured: boolValue(formData, "isFeatured"),
    status: enumValue(Object.values(ProviderStatus), formData.get("status"), ProviderStatus.PENDING),
    orderPreference: enumValue(Object.values(ProviderOrderPreference), formData.get("orderPreference"), ProviderOrderPreference.FLEXIBLE),
    minimumOrderQuantity: optionalInt(formData.get("minimumOrderQuantity")),
    maximumOrderQuantity: optionalInt(formData.get("maximumOrderQuantity")),
    moqMin: optionalInt(formData.get("moqMin")),
    acceptsSampling: boolValue(formData, "acceptsSampling"),
    acceptsSmallBatch: boolValue(formData, "acceptsSmallBatch"),
    acceptsLargeOrder: boolValue(formData, "acceptsLargeOrder"),
    sampleSupported: boolValue(formData, "sampleSupported"),
    singleSampleSupported: boolValue(formData, "singleSampleSupported"),
    patternMaking: optionalText(formData.get("patternMaking")),
    minimumOrder: optionalText(formData.get("minimumOrder")),
    sampleLeadDays: optionalInt(formData.get("sampleLeadDays")),
    productionLeadDays: optionalInt(formData.get("productionLeadDays")),
    leadTime: optionalText(formData.get("leadTime")),
    priceRange: optionalText(formData.get("priceRange")),
    monthlyCapacity: optionalText(formData.get("monthlyCapacity")),
    qualityControl: optionalText(formData.get("qualityControl")),
    capacityText: optionalText(formData.get("capacityText")),
    capacityStatus: enumValue(Object.values(ProviderCapacityStatus), formData.get("capacityStatus"), ProviderCapacityStatus.UNKNOWN),
    availabilityStatus: enumValue(Object.values(ProviderAvailabilityStatus), formData.get("availabilityStatus"), ProviderAvailabilityStatus.OPEN),
    supportedCategories: optionalText(formData.get("supportedCategories")),
    preferredMaterials: optionalText(formData.get("preferredMaterials")),
    preferredRegions: optionalText(formData.get("preferredRegions")),
    opportunityVisible: boolValue(formData, "opportunityVisible"),
    publicContactEnabled: boolValue(formData, "publicContactEnabled")
  };

  if (contactEmail) {
    const duplicate = await prisma.provider.findFirst({
      where: {
        contactEmail: { equals: contactEmail, mode: Prisma.QueryMode.insensitive },
        ...(id ? { id: { not: id } } : {})
      },
      select: { id: true, name: true }
    });
    if (duplicate) {
      throw new Error(`联系邮箱已关联服务商：${duplicate.name}`);
    }
  }

  if (id) await prisma.provider.update({ where: { id }, data });
  else await prisma.provider.create({ data });

  revalidatePath("/providers");
  revalidatePath("/admin/providers");
}

export async function reviewProviderApplication(formData: FormData) {
  await requireAdmin();
  const id = requiredText(formData.get("id"), "申请 ID");
  const status = enumValue(Object.values(ProviderApplicationStatus), formData.get("status"), ProviderApplicationStatus.PENDING);
  const reviewNote = optionalText(formData.get("reviewNote"));

  const application = await prisma.providerApplication.update({
    where: { id },
    data: { status, reviewNote }
  });

  if (status === ProviderApplicationStatus.APPROVED) {
    const applicationEmail = normalizeProviderEmail(application.email);
    const duplicateConditions: Prisma.ProviderWhereInput[] = [
      ...(application.userId ? [{ ownerId: application.userId }] : []),
      ...(applicationEmail ? [{ contactEmail: { equals: applicationEmail, mode: Prisma.QueryMode.insensitive } }] : [])
    ];
    const exists = duplicateConditions.length
      ? await prisma.provider.findFirst({
          where: {
            OR: duplicateConditions
          },
          select: { id: true }
        })
      : null;

    if (!exists) {
      await prisma.provider.create({
        data: {
          name: application.companyName,
          ownerId: application.userId,
          type: application.providerType,
          logoUrl: application.logoUrl,
          city: application.city,
          address: application.address,
          description: application.description,
          contactName: application.contactName,
          contactPhone: application.phone,
          contactEmail: applicationEmail,
          wechat: application.wechat,
          specialties: application.specialties,
          categories: application.categories,
          serviceRegions: application.serviceArea ? splitTags(application.serviceArea) : [],
          serviceArea: application.serviceArea,
          responseTime: application.responseTime,
          patternMaking: application.patternMaking,
          sampleSupported: application.sampleSupported,
          singleSampleSupported: application.singleSampleSupported,
          minimumOrder: application.minimumOrder,
          moqMin: parseMoq(application.minimumOrder),
          leadTime: application.leadTime,
          priceRange: application.priceRange,
          monthlyCapacity: application.monthlyCapacity,
          qualityControl: application.qualityControl,
          sampleLeadDays: application.providerType === ProviderType.SAMPLE_STUDIO ? parsePositiveDays(application.leadTime) : null,
          productionLeadDays: application.providerType === ProviderType.FACTORY ? parsePositiveDays(application.leadTime) : null,
          acceptsSampling: application.providerType === ProviderType.FABRIC_SUPPLIER ? Boolean(application.sampleSupported ?? true) : Boolean(application.singleSampleSupported ?? application.sampleSupported),
          acceptsSmallBatch: Boolean(application.smallOrderSupported),
          acceptsLargeOrder: application.providerType === ProviderType.FACTORY,
          capacityText: [application.monthlyCapacity, application.priceRange].filter(Boolean).join(" / ") || null,
          providerDetails: application.providerDetails === null ? undefined : (application.providerDetails as Prisma.InputJsonValue),
          status: ProviderStatus.ACTIVE,
          isVerified: true,
          opportunityVisible: true,
          tags: [],
          publicContactEnabled: false
        }
      });
    } else if (application.userId) {
      await prisma.provider.update({
        where: { id: exists.id },
        data: {
          ownerId: application.userId,
          contactEmail: applicationEmail ?? undefined,
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
      status: enumValue(Object.values(RecommendationStatus), formData.get("status"), RecommendationStatus.PENDING)
    },
    create: {
      workId,
      fabricId,
      providerId: optionalText(formData.get("providerId")) ?? fabric?.providerId ?? null,
      reason: optionalText(formData.get("reason")),
      recommendedBy: optionalText(formData.get("recommendedBy")) ?? "ADMIN",
      status: enumValue(Object.values(RecommendationStatus), formData.get("status"), RecommendationStatus.PENDING)
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
    type: enumValue(Object.values(ProviderWorkProposalType), formData.get("type"), ProviderWorkProposalType.OTHER),
    title: requiredText(formData.get("title"), "方案标题"),
    description: optionalText(formData.get("description")),
    estimatedPrice: optionalText(formData.get("estimatedPrice")),
    estimatedTime: optionalText(formData.get("estimatedTime")),
    moq: optionalText(formData.get("moq")),
    attachments: splitTags(formData.get("attachments")),
    status: enumValue(Object.values(ProviderWorkProposalStatus), formData.get("status"), ProviderWorkProposalStatus.PENDING)
  };

  if (id) await prisma.providerWorkProposal.update({ where: { id }, data });
  else await prisma.providerWorkProposal.create({ data });

  revalidatePath("/works");
  revalidatePath("/me/incubation");
  revalidatePath("/admin/provider-proposals");
}
