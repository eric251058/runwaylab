import {
  FabricStatus,
  ProviderApplication,
  ProviderShowcaseStatus,
  ProviderStatus,
  ProviderType,
  type Fabric,
  type Provider,
  type ProviderShowcaseItem,
  type Prisma
} from "@prisma/client";
import { parseMoq, parsePositiveDays } from "@/lib/provider-onboarding";
import { providerCompleteness, splitList } from "@/lib/supply-network";

type ApplicationForProvider = Pick<
  ProviderApplication,
  | "userId"
  | "providerType"
  | "companyName"
  | "logoUrl"
  | "city"
  | "address"
  | "description"
  | "contactName"
  | "phone"
  | "email"
  | "wechat"
  | "specialties"
  | "categories"
  | "serviceArea"
  | "responseTime"
  | "patternMaking"
  | "sampleSupported"
  | "singleSampleSupported"
  | "smallOrderSupported"
  | "minimumOrder"
  | "leadTime"
  | "priceRange"
  | "monthlyCapacity"
  | "qualityControl"
  | "providerDetails"
>;

export function providerDataFromApplication(
  application: ApplicationForProvider,
  overrides: Partial<Prisma.ProviderCreateInput> = {}
): Prisma.ProviderCreateInput {
  return {
    name: application.companyName,
    owner: application.userId ? { connect: { id: application.userId } } : undefined,
    type: application.providerType,
    logoUrl: application.logoUrl,
    city: application.city,
    address: application.address,
    description: application.description,
    contactName: application.contactName,
    contactPhone: application.phone,
    contactEmail: application.email,
    wechat: application.wechat,
    specialties: application.specialties,
    categories: application.categories,
    serviceRegions: application.serviceArea ? splitList(application.serviceArea) : [],
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
    acceptsSampling:
      application.providerType === ProviderType.FABRIC_SUPPLIER
        ? Boolean(application.sampleSupported ?? true)
        : Boolean(application.singleSampleSupported ?? application.sampleSupported),
    acceptsSmallBatch: Boolean(application.smallOrderSupported),
    acceptsLargeOrder: application.providerType === ProviderType.FACTORY,
    capacityText: [application.monthlyCapacity, application.priceRange].filter(Boolean).join(" / ") || null,
    providerDetails: application.providerDetails === null ? undefined : (application.providerDetails as Prisma.InputJsonValue),
    status: ProviderStatus.PENDING,
    isVerified: false,
    opportunityVisible: false,
    tags: [],
    publicContactEnabled: false,
    ...overrides
  };
}

type ProviderWithCatalog = Provider & {
  fabrics: Fabric[];
  showcaseItems: ProviderShowcaseItem[];
};

export function providerSelfServiceReadiness(provider: ProviderWithCatalog) {
  const completeness = providerCompleteness(provider);
  const hasBrandImage = Boolean(provider.logoUrl || provider.coverUrl);
  const hasIntroduction = Boolean(provider.tagline || provider.description);
  const hasContact = Boolean(provider.contactEmail || provider.contactPhone || provider.wechat || provider.whatsapp || provider.website);
  const hasCapability = provider.categories.length > 0 || provider.specialties.length > 0;
  const hasCatalog =
    provider.fabrics.some(
      (item) => item.status !== FabricStatus.ARCHIVED && Boolean(item.imageUrl || item.imageUrls.length)
    ) ||
    provider.showcaseItems.some(
      (item) => item.status !== ProviderShowcaseStatus.ARCHIVED && Boolean(item.coverImageUrl || item.imageUrls.length)
    );

  const checks = [
    { label: "品牌 Logo 或封面", ok: hasBrandImage },
    { label: "公司/工作室介绍", ok: hasIntroduction },
    { label: "所在城市", ok: Boolean(provider.city) },
    { label: "至少一项服务能力", ok: hasCapability },
    { label: "有效联系方式", ok: hasContact },
    { label: "至少一个带图产品或案例", ok: hasCatalog }
  ];

  return {
    ready: checks.every((item) => item.ok),
    missing: checks.filter((item) => !item.ok).map((item) => item.label),
    percent: completeness.percent
  };
}
