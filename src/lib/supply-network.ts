import {
  ProviderAvailabilityStatus,
  ProviderInquiryType,
  ProviderShowcaseStatus,
  ProviderShowcaseType,
  ProviderStatus,
  ProviderType,
  RequestStatus,
  UserRole,
  UserStatus,
  type Fabric,
  type Provider,
  type ProviderShowcaseItem,
  type User
} from "@prisma/client";

export const SUPPLY_PROVIDER_TYPES = [
  ProviderType.FABRIC_SUPPLIER,
  ProviderType.SAMPLE_STUDIO,
  ProviderType.FACTORY
] as const;

export const SUPPLY_PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  FABRIC_SUPPLIER: "面料供应商",
  SAMPLE_STUDIO: "打样工作室",
  FACTORY: "生产工厂",
  BUYER: "买手/采购商",
  OTHER: "专业服务"
};

export const PROVIDER_AVAILABILITY_LABELS: Record<ProviderAvailabilityStatus, string> = {
  OPEN: "接单中",
  BUSY: "档期较满",
  PAUSED: "暂停接单"
};

export const PROVIDER_SHOWCASE_TYPE_LABELS: Record<ProviderShowcaseType, string> = {
  SAMPLE_CASE: "打样案例",
  PRODUCTION_CASE: "生产案例",
  SERVICE: "服务项目"
};

export const PROVIDER_SHOWCASE_STATUS_LABELS: Record<ProviderShowcaseStatus, string> = {
  DRAFT: "草稿",
  PENDING_REVIEW: "待审核",
  PUBLISHED: "已发布",
  REJECTED: "需修改",
  ARCHIVED: "已下架"
};

export const PROVIDER_INQUIRY_TYPE_LABELS: Record<ProviderInquiryType, string> = {
  GENERAL: "一般合作",
  FABRIC_SAMPLE: "面料样卡",
  SAMPLE_DEVELOPMENT: "打样开发",
  SMALL_BATCH: "小单生产",
  MASS_PRODUCTION: "大货生产"
};

export const PROVIDER_INQUIRY_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "新询盘",
  CONTACTED: "已读/已联系",
  EVALUATED: "已评估",
  QUOTED: "已回复",
  CLOSED: "已关闭",
  COMPLETED: "已完成"
};

export function cleanText(value?: string | null) {
  const text = value?.trim();
  if (!text || ["null", "undefined", "none", "-"].includes(text.toLowerCase())) return null;
  return text;
}

export function splitList(value?: string | null, limit = 20) {
  if (!value) return [];
  return value
    .split(/[,\n，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 40))
    .slice(0, limit);
}

export function listText(items?: string[] | null, fallback = "待补充") {
  return items?.length ? items.join(" / ") : fallback;
}

export function isAdminUser(user: Pick<User, "role" | "status"> | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

export function providerBelongsToUser(
  provider: Pick<Provider, "ownerId" | "contactEmail">,
  user: Pick<User, "id" | "email" | "role" | "status"> | null | undefined
) {
  if (!user || user.status !== UserStatus.ACTIVE) return false;
  if (user.role === UserRole.ADMIN) return true;
  return provider.ownerId === user.id || Boolean(provider.contactEmail && provider.contactEmail === user.email);
}

export function publicProviderWhere() {
  return {
    status: ProviderStatus.ACTIVE,
    opportunityVisible: true,
    type: {
      in: [...SUPPLY_PROVIDER_TYPES]
    }
  };
}

export function visibleImage(value?: string | null) {
  const url = cleanText(value);
  if (!url) return null;
  return /^(https?:\/\/|\/|data:image\/)/i.test(url) ? url : null;
}

export function providerDisplayImage(provider: Pick<Provider, "coverUrl" | "logoUrl">) {
  return visibleImage(provider.coverUrl) ?? visibleImage(provider.logoUrl);
}

export function getProviderTags(provider: Pick<Provider, "specialties" | "categories" | "materials" | "techniques" | "tags">, limit = 3) {
  return [...provider.specialties, ...provider.categories, ...provider.materials, ...provider.techniques, ...provider.tags]
    .filter(Boolean)
    .slice(0, limit);
}

export function getProviderFitTags(provider: Pick<Provider, "type" | "acceptsSampling" | "acceptsSmallBatch" | "acceptsLargeOrder" | "minimumOrderQuantity" | "moqMin" | "categories" | "materials">) {
  const tags: string[] = [];
  if (provider.type === ProviderType.FABRIC_SUPPLIER) tags.push("面料匹配");
  if (provider.type === ProviderType.SAMPLE_STUDIO) tags.push("样衣打样");
  if (provider.type === ProviderType.FACTORY) tags.push("生产落地");
  if (provider.acceptsSampling) tags.push("适合学生毕业设计");
  if (provider.acceptsSmallBatch) tags.push("适合 50-200 件小单");
  if (provider.acceptsLargeOrder) tags.push("适合品牌大货");
  const moq = provider.moqMin ?? provider.minimumOrderQuantity;
  if (moq) tags.push(`MOQ ${moq}+`);
  if (provider.categories[0]) tags.push(`擅长${provider.categories[0]}`);
  if (provider.materials[0]) tags.push(`适合${provider.materials[0]}`);
  return tags.slice(0, 6);
}

export function providerCompleteness(
  provider: Pick<
    Provider,
    | "logoUrl"
    | "coverUrl"
    | "tagline"
    | "description"
    | "city"
    | "categories"
    | "specialties"
    | "materials"
    | "techniques"
    | "serviceRegions"
    | "minimumOrderQuantity"
    | "moqMin"
    | "sampleLeadDays"
    | "productionLeadDays"
    | "contactEmail"
    | "contactPhone"
    | "wechat"
    | "whatsapp"
    | "website"
    | "publicContactEnabled"
  > & {
    fabrics?: Fabric[];
    showcaseItems?: ProviderShowcaseItem[];
  }
) {
  const checks = [
    { label: "Logo", ok: Boolean(cleanText(provider.logoUrl)) },
    { label: "封面图", ok: Boolean(cleanText(provider.coverUrl)) },
    { label: "一句定位", ok: Boolean(cleanText(provider.tagline)) },
    { label: "公司/工作室介绍", ok: Boolean(cleanText(provider.description)) },
    { label: "城市", ok: Boolean(cleanText(provider.city)) },
    { label: "擅长品类", ok: provider.categories.length > 0 || provider.specialties.length > 0 },
    { label: "至少三个能力标签", ok: [...provider.categories, ...provider.specialties, ...provider.materials, ...provider.techniques].length >= 3 },
    { label: "服务地区", ok: provider.serviceRegions.length > 0 },
    { label: "MOQ 或参考周期", ok: Boolean(provider.moqMin ?? provider.minimumOrderQuantity ?? provider.sampleLeadDays ?? provider.productionLeadDays) },
    { label: "至少一个产品或案例", ok: Boolean(provider.fabrics?.length || provider.showcaseItems?.length) },
    { label: "联系方式或站内询盘", ok: provider.publicContactEnabled || Boolean(provider.contactEmail || provider.contactPhone || provider.wechat || provider.whatsapp || provider.website) }
  ];
  const done = checks.filter((item) => item.ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter((item) => !item.ok).map((item) => item.label)
  };
}

export function providerPublicUrl(provider: Pick<Provider, "id" | "slug">) {
  return `/providers/${provider.slug ?? provider.id}`;
}
