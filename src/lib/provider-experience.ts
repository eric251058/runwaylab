import { ProviderInquiryType, ProviderType, UserPersona } from "@prisma/client";
import { z } from "zod";

export const PROVIDER_SERVICE_TAGS = [
  "面料供应",
  "辅料供应",
  "服装打样",
  "小单生产",
  "大货生产",
  "版型设计",
  "印花绣花",
  "其他服务"
] as const;

export const CONTACT_AUTH_OPTIONS = [
  { value: "SITE_ONLY", label: "先通过站内沟通" },
  { value: "ALLOW_PHONE", label: "允许查看我的手机号" },
  { value: "ALLOW_EMAIL", label: "允许查看我的邮箱" }
] as const;

export const PROVIDER_INQUIRY_TYPE_COPY: Record<ProviderInquiryType, string> = {
  GENERAL: "其他",
  FABRIC_SAMPLE: "面料",
  ACCESSORY: "辅料",
  SAMPLE_DEVELOPMENT: "打样",
  PROCESS: "工艺",
  SMALL_BATCH: "小单生产",
  MASS_PRODUCTION: "大货生产",
  OTHER: "其他"
};

export const PROVIDER_RECOMMENDATION_TYPES = [
  { value: "FABRIC", label: "推荐面料" },
  { value: "SAMPLE", label: "提供打样" },
  { value: "PRODUCTION", label: "提供生产" },
  { value: "ACCESSORY", label: "推荐辅料" },
  { value: "PROCESS", label: "提供工艺建议" }
] as const;

export const quickProviderSchema = z.object({
  name: z.string().trim().min(1, "请填写服务商名称。").max(100, "服务商名称最多 100 个字。"),
  services: z.array(z.enum(PROVIDER_SERVICE_TAGS)).min(1, "请至少选择一项服务。").max(8),
  intro: z.string().trim().max(120, "一句话介绍最多 120 个字。").optional().nullable(),
  skipProfile: z.boolean().optional()
});

export type QuickProviderInput = z.infer<typeof quickProviderSchema>;

export function normalizeProviderServices(values: unknown) {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is (typeof PROVIDER_SERVICE_TAGS)[number] =>
    typeof value === "string" && (PROVIDER_SERVICE_TAGS as readonly string[]).includes(value)
  );
}

export function providerTypeFromServices(services: string[]) {
  if (services.some((item) => item.includes("生产"))) return ProviderType.FACTORY;
  if (services.some((item) => item.includes("打样") || item.includes("版型") || item.includes("印花"))) {
    return ProviderType.SAMPLE_STUDIO;
  }
  if (services.some((item) => item.includes("面料") || item.includes("辅料"))) return ProviderType.FABRIC_SUPPLIER;
  return ProviderType.OTHER;
}

export function personaForProviderType(type: ProviderType) {
  if (type === ProviderType.FABRIC_SUPPLIER) return UserPersona.FABRIC_SUPPLIER;
  if (type === ProviderType.SAMPLE_STUDIO) return UserPersona.SAMPLE_STUDIO;
  if (type === ProviderType.FACTORY) return UserPersona.FACTORY;
  if (type === ProviderType.BUYER) return UserPersona.BUYER;
  return UserPersona.OTHER;
}

export function providerTypeFromRecommendation(value: string) {
  if (value === "SAMPLE") return "SAMPLE" as const;
  if (value === "PRODUCTION") return "PRODUCTION" as const;
  return "OTHER" as const;
}

export function inquiryTypeFromInput(value: string | null | undefined) {
  if (value === "FABRIC_SAMPLE") return ProviderInquiryType.FABRIC_SAMPLE;
  if (value === "ACCESSORY") return ProviderInquiryType.ACCESSORY;
  if (value === "SAMPLE_DEVELOPMENT") return ProviderInquiryType.SAMPLE_DEVELOPMENT;
  if (value === "PROCESS") return ProviderInquiryType.PROCESS;
  if (value === "SMALL_BATCH") return ProviderInquiryType.SMALL_BATCH;
  if (value === "MASS_PRODUCTION") return ProviderInquiryType.MASS_PRODUCTION;
  if (value === "OTHER") return ProviderInquiryType.OTHER;
  return ProviderInquiryType.GENERAL;
}

export function maskPhone(value?: string | null) {
  const phone = value?.trim();
  if (!phone) return "未填写";
  if (phone.length <= 4) return "****";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function maskEmail(value?: string | null) {
  const email = value?.trim();
  if (!email) return "未填写";
  const [name, domain] = email.split("@");
  if (!name || !domain) return "已填写";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function cleanReplyContent(value: unknown, maxLength = 1000) {
  const text = typeof value === "string" ? value.replace(/\s+\n/g, "\n").trim() : "";
  return text.slice(0, maxLength);
}
