import {
  CaseStudyStatus,
  CollaborationProjectPriority,
  CollaborationProjectStatus,
  ProjectOrderStatus,
  ReviewStatus,
  ReviewTargetType,
  VerificationStatus,
  VerificationType
} from "@prisma/client";

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  DESIGNER: "设计师",
  TEACHER: "老师",
  SCHOOL: "学校",
  FABRIC_SUPPLIER: "面料商",
  SAMPLE_STUDIO: "制版打样工作室",
  FACTORY: "服装工厂",
  BUYER: "买手 / 采购商",
  OTHER: "其他"
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

export const PROJECT_STATUS_LABELS: Record<CollaborationProjectStatus, string> = {
  DRAFT: "草稿",
  SEEKING_OWNER: "寻找项目负责人",
  PLANNING: "方案规划中",
  SEEKING_PROPOSALS: "征集服务方案",
  SAMPLE_PREPARATION: "样衣准备中",
  SAMPLE_REVIEW: "样衣评估中",
  PREORDER_READY: "预售准备中",
  PREORDER_OPEN: "限量预订中",
  PRODUCTION: "生产推进中",
  QUALITY_CHECK: "质检中",
  SHIPPING: "发货中",
  PAUSED: "已暂停",
  MATCHING: "资源匹配中",
  SAMPLING: "打样推进中",
  PRESALE_VALIDATING: "预售验证中",
  PRODUCTION_DISCUSSION: "生产沟通中",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const PROJECT_PRIORITY_LABELS: Record<CollaborationProjectPriority, string> = {
  LOW: "低",
  NORMAL: "普通",
  HIGH: "高",
  URGENT: "紧急"
};

export const PROJECT_ORDER_STATUS_LABELS: Record<ProjectOrderStatus, string> = {
  INTENT: "合作意向",
  RESERVATION: "预订意向",
  PENDING_PAYMENT: "待确认付款",
  CONFIRMED: "已确认",
  IN_PROGRESS: "推进中",
  PRODUCTION: "生产中",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  REFUND_PENDING: "退款处理中",
  REFUNDED: "已退款"
};

export const REVIEW_STATUS_LABELS: Partial<Record<ReviewStatus, string>> = {
  PENDING: "待审核",
  PUBLISHED: "已发布",
  HIDDEN: "已隐藏"
};

export const REVIEW_TARGET_LABELS: Record<ReviewTargetType, string> = {
  USER: "用户",
  PROVIDER: "服务商",
  WORK: "作品",
  PROJECT: "项目"
};

export const CASE_STATUS_LABELS: Record<CaseStudyStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档"
};

export function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

export function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  const text = optionalText(value);
  return text && allowed.includes(text as T) ? (text as T) : fallback;
}

export function publicProjectWhere() {
  return {
    status: {
      notIn: [CollaborationProjectStatus.DRAFT, CollaborationProjectStatus.CANCELLED]
    }
  };
}
