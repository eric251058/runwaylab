"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  FabricStatus,
  ProviderAvailabilityStatus,
  ProviderShowcaseStatus,
  ProviderShowcaseType,
  ProviderStatus,
  ProviderType,
  RequestStatus
} from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getAnyProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { providerBelongsToUser, splitList } from "@/lib/supply-network";

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function intValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dateValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireProviderForWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");
  const provider = await getAnyProviderForUser(user);
  if (!provider) throw new Error("请先完成服务商入驻和审核");
  if (!isAdmin(user) && !providerBelongsToUser(provider, user)) throw new Error("没有权限管理该服务商");
  if (provider.status === ProviderStatus.SUSPENDED) throw new Error("服务商账号已暂停，请联系平台处理");
  if (provider.status !== ProviderStatus.ACTIVE && !isAdmin(user)) throw new Error("服务商尚未通过审核");
  return { user, provider };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "服务商名称不能为空").max(100),
  tagline: z.string().trim().max(180).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  province: z.string().trim().max(60).optional().nullable(),
  country: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  coverUrl: z.string().trim().max(500).optional().nullable(),
  contactName: z.string().trim().max(60).optional().nullable(),
  contactPhone: z.string().trim().max(80).optional().nullable(),
  contactEmail: z.string().trim().max(120).optional().nullable(),
  wechat: z.string().trim().max(80).optional().nullable(),
  whatsapp: z.string().trim().max(80).optional().nullable(),
  website: z.string().trim().max(500).optional().nullable()
});

export async function saveProviderCenterProfile(formData: FormData) {
  const { provider } = await requireProviderForWrite();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    city: formData.get("city"),
    province: formData.get("province"),
    country: formData.get("country"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    coverUrl: formData.get("coverUrl"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    wechat: formData.get("wechat"),
    whatsapp: formData.get("whatsapp"),
    website: formData.get("website")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "请检查服务商资料");

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      ...parsed.data,
      country: parsed.data.country || "China",
      specialties: splitList(textValue(formData, "specialties")),
      categories: splitList(textValue(formData, "categories")),
      materials: splitList(textValue(formData, "materials")),
      techniques: splitList(textValue(formData, "techniques")),
      serviceRegions: splitList(textValue(formData, "serviceRegions")),
      tags: splitList(textValue(formData, "tags")),
      minimumOrderQuantity: intValue(formData, "minimumOrderQuantity") ?? intValue(formData, "moqMin"),
      maximumOrderQuantity: intValue(formData, "maximumOrderQuantity"),
      moqMin: intValue(formData, "moqMin"),
      sampleLeadDays: intValue(formData, "sampleLeadDays"),
      productionLeadDays: intValue(formData, "productionLeadDays"),
      capacityText: textValue(formData, "capacityText"),
      acceptsSampling: boolValue(formData, "acceptsSampling"),
      acceptsSmallBatch: boolValue(formData, "acceptsSmallBatch"),
      acceptsLargeOrder: boolValue(formData, "acceptsLargeOrder"),
      availabilityStatus: (textValue(formData, "availabilityStatus") ?? ProviderAvailabilityStatus.OPEN) as ProviderAvailabilityStatus,
      publicContactEnabled: boolValue(formData, "publicContactEnabled"),
      opportunityVisible: true
    }
  });

  revalidatePath("/provider-center");
  revalidatePath("/provider-center/profile");
  revalidatePath(`/providers/${provider.slug ?? provider.id}`);
  revalidatePath("/providers");
  redirect("/provider-center?profile=updated");
}

const fabricSchema = z.object({
  name: z.string().trim().min(1, "面料名称不能为空").max(100),
  slug: z.string().trim().max(120).optional().nullable(),
  code: z.string().trim().max(80).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  composition: z.string().trim().max(160).optional().nullable(),
  weight: z.string().trim().max(80).optional().nullable(),
  width: z.string().trim().max(80).optional().nullable(),
  color: z.string().trim().max(120).optional().nullable(),
  texture: z.string().trim().max(160).optional().nullable(),
  season: z.string().trim().max(120).optional().nullable(),
  usage: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  priceNote: z.string().trim().max(200).optional().nullable(),
  moqNote: z.string().trim().max(200).optional().nullable(),
  status: z.nativeEnum(FabricStatus).optional()
});

export async function saveProviderCenterFabric(formData: FormData) {
  const { provider } = await requireProviderForWrite();
  if (provider.type !== ProviderType.FABRIC_SUPPLIER) throw new Error("只有面料商可以管理面料产品");
  const id = textValue(formData, "id");
  const parsed = fabricSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    code: formData.get("code"),
    imageUrl: formData.get("imageUrl"),
    composition: formData.get("composition"),
    weight: formData.get("weight"),
    width: formData.get("width"),
    color: formData.get("color"),
    texture: formData.get("texture"),
    season: formData.get("season"),
    usage: formData.get("usage"),
    description: formData.get("description"),
    priceNote: formData.get("priceNote"),
    moqNote: formData.get("moqNote"),
    status: formData.get("status") || FabricStatus.ACTIVE
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "请检查面料信息");

  const data = {
    ...parsed.data,
    imageUrls: splitList(textValue(formData, "imageUrls"), 8),
    tags: splitList(textValue(formData, "tags")),
    providerId: provider.id,
    status: parsed.data.status ?? FabricStatus.ACTIVE
  };

  if (id) {
    const fabric = await prisma.fabric.findUnique({ where: { id }, select: { providerId: true } });
    if (!fabric || fabric.providerId !== provider.id) throw new Error("没有权限编辑该面料");
    await prisma.fabric.update({ where: { id }, data });
  } else {
    await prisma.fabric.create({ data: { ...data, isFeatured: false } });
  }

  revalidatePath("/provider-center/fabrics");
  revalidatePath("/fabrics");
  revalidatePath(`/providers/${provider.slug ?? provider.id}`);
  redirect("/provider-center/fabrics?saved=1");
}

const showcaseSchema = z.object({
  type: z.nativeEnum(ProviderShowcaseType),
  title: z.string().trim().min(1, "案例标题不能为空").max(100),
  summary: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  quantityRange: z.string().trim().max(100).optional().nullable(),
  capacityText: z.string().trim().max(500).optional().nullable()
});

export async function saveProviderShowcaseItem(formData: FormData) {
  const { provider } = await requireProviderForWrite();
  const id = textValue(formData, "id");
  const intent = textValue(formData, "intent") ?? "draft";
  const parsed = showcaseSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    coverImageUrl: formData.get("coverImageUrl"),
    category: formData.get("category"),
    quantityRange: formData.get("quantityRange"),
    capacityText: formData.get("capacityText")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "请检查案例信息");

  const nextStatus = intent === "submit" ? ProviderShowcaseStatus.PENDING_REVIEW : ProviderShowcaseStatus.DRAFT;
  const data = {
    ...parsed.data,
    imageUrls: splitList(textValue(formData, "imageUrls"), 8),
    tags: splitList(textValue(formData, "tags")),
    materials: splitList(textValue(formData, "materials")),
    techniques: splitList(textValue(formData, "techniques")),
    moqMin: intValue(formData, "moqMin"),
    leadTimeDays: intValue(formData, "leadTimeDays"),
    status: nextStatus,
    providerId: provider.id,
    reviewNote: null,
    publishedAt: null
  };

  if (id) {
    const item = await prisma.providerShowcaseItem.findUnique({ where: { id }, select: { providerId: true } });
    if (!item || item.providerId !== provider.id) throw new Error("没有权限编辑该案例");
    await prisma.providerShowcaseItem.update({ where: { id }, data });
  } else {
    await prisma.providerShowcaseItem.create({ data });
  }

  revalidatePath("/provider-center/showcase");
  revalidatePath(`/providers/${provider.slug ?? provider.id}`);
  redirect("/provider-center/showcase");
}

export async function reviewProviderShowcaseItem(formData: FormData) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");
  const id = textValue(formData, "id");
  if (!id) throw new Error("缺少案例 ID");
  const status = (textValue(formData, "status") ?? ProviderShowcaseStatus.PENDING_REVIEW) as ProviderShowcaseStatus;
  const allowedShowcaseStatuses: ProviderShowcaseStatus[] = [
    ProviderShowcaseStatus.PUBLISHED,
    ProviderShowcaseStatus.REJECTED,
    ProviderShowcaseStatus.ARCHIVED,
    ProviderShowcaseStatus.PENDING_REVIEW
  ];
  if (!allowedShowcaseStatuses.includes(status)) {
    throw new Error("案例状态不合法");
  }

  const item = await prisma.providerShowcaseItem.update({
    where: { id },
    data: {
      status,
      reviewNote: textValue(formData, "reviewNote"),
      isFeatured: boolValue(formData, "isFeatured"),
      reviewedAt: new Date(),
      reviewedById: user!.id,
      publishedAt: status === ProviderShowcaseStatus.PUBLISHED ? new Date() : null
    },
    include: { provider: true }
  });

  revalidatePath("/admin/providers");
  revalidatePath("/providers");
  revalidatePath(`/providers/${item.provider.slug ?? item.provider.id}`);
}

export async function updateProviderInquiry(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");
  const id = textValue(formData, "id");
  if (!id) throw new Error("缺少询盘 ID");
  const inquiry = await prisma.cooperationRequest.findUnique({
    where: { id },
    include: { provider: true }
  });
  if (!inquiry || !inquiry.providerId || !inquiry.provider) throw new Error("询盘不存在");
  if (!isAdmin(user) && !providerBelongsToUser(inquiry.provider, user)) throw new Error("没有权限处理该询盘");

  const status = (textValue(formData, "status") ?? RequestStatus.CONTACTED) as RequestStatus;
  if (!Object.values(RequestStatus).includes(status)) throw new Error("询盘状态不合法");
  const now = new Date();

  await prisma.cooperationRequest.update({
    where: { id },
    data: {
      status,
      providerResponse: textValue(formData, "providerResponse"),
      viewedAt: inquiry.viewedAt ?? now,
      respondedAt: ([RequestStatus.QUOTED, RequestStatus.CLOSED, RequestStatus.COMPLETED] as RequestStatus[]).includes(status) ? now : inquiry.respondedAt,
      handledAt: ([RequestStatus.CLOSED, RequestStatus.COMPLETED] as RequestStatus[]).includes(status) ? now : inquiry.handledAt
    }
  });

  revalidatePath("/provider-center/inquiries");
  revalidatePath("/admin/providers");
}

export async function createExpectedDateFromForm(formData: FormData) {
  return dateValue(formData, "expectedDate");
}
