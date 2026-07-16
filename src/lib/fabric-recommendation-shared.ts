export const FABRIC_RECOMMENDATION_STATUS_LABELS = {
  PENDING: "等待设计师查看",
  ACCEPTED: "设计师感兴趣",
  REJECTED: "暂不合适",
  INTERESTED: "设计师感兴趣",
  NOT_SUITABLE: "暂不合适",
  WITHDRAWN: "已撤回"
} as const;

export const sampleAvailabilityOptions = ["可寄样", "暂不寄样", "需确认"] as const;
export const responseTimeOptions = ["当天", "1 个工作日", "3 个工作日内"] as const;

export function recommendationConditionText(item: {
  sampleAvailability?: string | null;
  moqText?: string | null;
  responseTime?: string | null;
}) {
  return [item.sampleAvailability, item.moqText ? `MOQ ${item.moqText}` : null, item.responseTime ? `${item.responseTime}回复` : null]
    .filter(Boolean)
    .join(" · ");
}
