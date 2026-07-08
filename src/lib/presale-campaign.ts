import { PresaleCampaignIntentStatus, PresaleCampaignStatus } from "@prisma/client";

export const PRESALE_CAMPAIGN_STATUS_LABELS: Record<PresaleCampaignStatus, string> = {
  DRAFT: "草稿",
  ACTIVE: "验证中",
  PAUSED: "已暂停",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const PRESALE_INTENT_STATUS_LABELS: Record<PresaleCampaignIntentStatus, string> = {
  SUBMITTED: "已提交",
  CONTACTED: "已联系",
  CONFIRMED: "已确认",
  CANCELLED: "已取消"
};

export function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

export function splitOptions(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/[,，\n\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function positiveInt(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function presaleProgress(currentCount: number, targetCount: number) {
  if (targetCount <= 0) return 0;
  return Math.min(100, Math.round((currentCount / targetCount) * 100));
}

export function formatPresaleDate(value?: Date | null) {
  if (!value) return "时间待定";
  return value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}
