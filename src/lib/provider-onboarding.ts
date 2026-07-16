import { ProviderInquiryType, ProviderShowcaseType, ProviderType } from "@prisma/client";

export const ONBOARDING_PROVIDER_TYPES = [
  ProviderType.FABRIC_SUPPLIER,
  ProviderType.SAMPLE_STUDIO,
  ProviderType.FACTORY
] as const;

export type OnboardingProviderType = (typeof ONBOARDING_PROVIDER_TYPES)[number];

export const PROVIDER_TYPE_SHORT_LABELS: Record<ProviderType, string> = {
  FABRIC_SUPPLIER: "面料供应商",
  SAMPLE_STUDIO: "打样工作室",
  FACTORY: "生产工厂",
  BUYER: "买手/采购商",
  OTHER: "专业服务"
};

export const CATEGORY_OPTIONS = [
  ["DRESS", "连衣裙"],
  ["SHIRT", "衬衫"],
  ["SUIT", "西装"],
  ["COAT", "外套"],
  ["KNITWEAR", "针织"],
  ["PANTS", "裤装"],
  ["EVENING_WEAR", "礼服"],
  ["CHILDREN", "童装"],
  ["OTHER", "其他"]
] as const;

export const SERVICE_TYPE_CARDS: Record<OnboardingProviderType, {
  title: string;
  description: string;
  button: string;
  strengths: string[];
}> = {
  FABRIC_SUPPLIER: {
    title: "面料供应商",
    description: "展示面料产品，并向设计师推荐适合的面料。",
    button: "入驻成为面料供应商",
    strengths: ["上传面料产品", "推荐给设计师", "承接样布咨询"]
  },
  SAMPLE_STUDIO: {
    title: "打样工作室",
    description: "承接制版、样衣制作和小单打样需求。",
    button: "入驻成为打样工作室",
    strengths: ["展示打样案例", "承接样衣开发", "对接设计师作品"]
  },
  FACTORY: {
    title: "生产工厂",
    description: "承接小批量生产和后续量产合作。",
    button: "入驻成为生产工厂",
    strengths: ["展示生产能力", "承接小单生产", "积累合作机会"]
  }
};

export const PROVIDER_WORKBENCH_COPY: Record<OnboardingProviderType, {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  opportunityLabel: string;
  opportunityHref: string;
}> = {
  FABRIC_SUPPLIER: {
    title: "面料供应商工作台",
    description: "管理产品，向设计师推荐面料。",
    primaryLabel: "上传面料",
    primaryHref: "/provider-center/fabrics/new",
    secondaryLabel: "管理产品",
    secondaryHref: "/provider-center/fabrics",
    opportunityLabel: "我的推荐",
    opportunityHref: "/provider-center/recommendations"
  },
  SAMPLE_STUDIO: {
    title: "打样工作室工作台",
    description: "展示打样案例，承接设计师的样衣与制版需求。",
    primaryLabel: "上传打样案例",
    primaryHref: "/provider-center/showcase/new",
    secondaryLabel: "管理案例",
    secondaryHref: "/provider-center/showcase",
    opportunityLabel: "查看合作机会",
    opportunityHref: "/providers/opportunities"
  },
  FACTORY: {
    title: "生产工厂工作台",
    description: "展示生产能力，承接小批量和量产合作。",
    primaryLabel: "上传生产案例",
    primaryHref: "/provider-center/showcase/new",
    secondaryLabel: "管理案例",
    secondaryHref: "/provider-center/showcase",
    opportunityLabel: "查看合作机会",
    opportunityHref: "/providers/opportunities"
  }
};

export function isOnboardingProviderType(value?: string | null): value is OnboardingProviderType {
  return ONBOARDING_PROVIDER_TYPES.includes(value as OnboardingProviderType);
}

export function providerShowcaseTypeForProvider(type: ProviderType) {
  if (type === ProviderType.FACTORY) return ProviderShowcaseType.PRODUCTION_CASE;
  if (type === ProviderType.SAMPLE_STUDIO) return ProviderShowcaseType.SAMPLE_CASE;
  return ProviderShowcaseType.SERVICE;
}

export function providerInquiryTypeForProvider(type: ProviderType) {
  if (type === ProviderType.FACTORY) return ProviderInquiryType.SMALL_BATCH;
  if (type === ProviderType.SAMPLE_STUDIO) return ProviderInquiryType.SAMPLE_DEVELOPMENT;
  if (type === ProviderType.FABRIC_SUPPLIER) return ProviderInquiryType.FABRIC_SAMPLE;
  return ProviderInquiryType.GENERAL;
}

export function parsePositiveDays(value?: string | null) {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseMoq(value?: string | null) {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
