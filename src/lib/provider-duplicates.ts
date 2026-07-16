import type { ProviderType } from "@prisma/client";

export type ProviderDuplicateRisk = {
  level: "high" | "medium";
  message: string;
};

export type ProviderDuplicateCandidate = {
  id: string;
  name: string;
  city?: string | null;
  ownerId?: string | null;
  contactEmail?: string | null;
  type: ProviderType;
};

export function normalizeProviderEmail(value?: string | null) {
  const text = value?.trim().toLowerCase();
  return text || null;
}

export function normalizeProviderName(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.·,，。()（）]/g, "")
    .replace(/(有限公司|有限责任公司|服饰|纺织|工作室|工厂|factory|studio|co\.?ltd\.?|ltd)$/gi, "");
}

export function providerDuplicateRisks(
  application: {
    userId?: string | null;
    companyName: string;
    city?: string | null;
    email?: string | null;
    providerType: ProviderType;
  },
  providers: ProviderDuplicateCandidate[]
): ProviderDuplicateRisk[] {
  const email = normalizeProviderEmail(application.email);
  const nameKey = normalizeProviderName(application.companyName);
  const cityKey = application.city?.trim().toLowerCase();
  const risks: ProviderDuplicateRisk[] = [];

  const sameOwner = application.userId ? providers.filter((provider) => provider.ownerId === application.userId) : [];
  if (sameOwner.length) {
    risks.push({
      level: "high",
      message: `同一账号已有关联服务商：${sameOwner.map((provider) => provider.name).join("、")}`
    });
  }

  const sameEmail = email ? providers.filter((provider) => normalizeProviderEmail(provider.contactEmail) === email) : [];
  if (sameEmail.length) {
    risks.push({
      level: "high",
      message: `相同联系邮箱已存在：${sameEmail.map((provider) => provider.name).join("、")}`
    });
  }

  if (nameKey) {
    const sameName = providers.filter((provider) => normalizeProviderName(provider.name) === nameKey);
    if (sameName.length) {
      const sameCity = sameName.filter((provider) => provider.city?.trim().toLowerCase() === cityKey);
      risks.push({
        level: sameCity.length ? "high" : "medium",
        message: `${sameCity.length ? "同名且同城市" : "规范化名称相同"}：${sameName.map((provider) => [provider.name, provider.city].filter(Boolean).join(" / ")).join("、")}`
      });
    }
  }

  return risks;
}
