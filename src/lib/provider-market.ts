import { FabricStatus, ProviderType, type ProviderWorkProposalType } from "@prisma/client";

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  FABRIC_SUPPLIER: "面料商",
  SAMPLE_STUDIO: "打样工作室",
  FACTORY: "服装工厂",
  BUYER: "买手/采购商",
  OTHER: "其他服务商"
};

export const PROVIDER_PROPOSAL_TYPE_LABELS: Record<ProviderWorkProposalType, string> = {
  FABRIC: "面料方案",
  SAMPLE: "打样方案",
  PRODUCTION: "生产方案",
  BUYER_INTENT: "采购意向",
  OTHER: "其他方案"
};

export const PROVIDER_PLACEHOLDERS = {
  cover: "/placeholders/provider-cover.svg",
  logo: "/placeholders/provider-logo.svg",
  fabric: "/placeholders/fabric-cover.svg"
} as const;

function validImageUrl(value?: string | null) {
  const url = value?.trim();
  if (!url || ["null", "undefined", "none", "-"].includes(url.toLowerCase())) return null;
  return /^(https?:\/\/|\/|data:image\/)/i.test(url) ? url : null;
}

export function providerCoverUrl(value?: string | null) {
  return validImageUrl(value) ?? PROVIDER_PLACEHOLDERS.cover;
}

export function providerLogoUrl(value?: string | null) {
  return validImageUrl(value) ?? PROVIDER_PLACEHOLDERS.logo;
}

export function fabricCoverUrl(value?: string | null) {
  return validImageUrl(value) ?? PROVIDER_PLACEHOLDERS.fabric;
}

export function splitTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

export function maskContact(value?: string | null) {
  const text = value?.trim();
  if (!text) return "提交合作意向后由平台协助联系";
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (/^\d{7,}$/.test(text)) {
    return `${text.slice(0, 3)}****${text.slice(-4)}`;
  }
  if (text.length <= 4) return `${text.slice(0, 1)}***`;
  return `${text.slice(0, 2)}***${text.slice(-1)}`;
}

export const activeFabricWhere = {
  status: FabricStatus.ACTIVE
};
