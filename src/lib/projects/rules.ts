import {
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  ProjectDesignAuthorizationStatus,
  ProjectIssueStatus,
  ProjectIssueType,
  ProjectMilestoneStatus,
  ProjectOrderFulfillmentStatus,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus,
  ProjectProductStatus,
  type UserRole,
  type UserStatus
} from "@prisma/client";

export const PUBLIC_PROJECT_STATUSES = [
  CollaborationProjectStatus.SEEKING_OWNER,
  CollaborationProjectStatus.PLANNING,
  CollaborationProjectStatus.SEEKING_PROPOSALS,
  CollaborationProjectStatus.SAMPLE_PREPARATION,
  CollaborationProjectStatus.SAMPLE_REVIEW,
  CollaborationProjectStatus.PREORDER_READY,
  CollaborationProjectStatus.PREORDER_OPEN,
  CollaborationProjectStatus.PRODUCTION,
  CollaborationProjectStatus.QUALITY_CHECK,
  CollaborationProjectStatus.SHIPPING,
  CollaborationProjectStatus.MATCHING,
  CollaborationProjectStatus.SAMPLING,
  CollaborationProjectStatus.PRESALE_VALIDATING,
  CollaborationProjectStatus.PRODUCTION_DISCUSSION,
  CollaborationProjectStatus.COMPLETED
] as const;

export const PROJECT_VISIBILITY_LABELS: Record<CollaborationProjectVisibility, string> = {
  PRIVATE: "仅内部可见",
  PARTICIPANTS: "参与方可见",
  PUBLIC: "公开展示"
};

export const PROJECT_AUTHORIZATION_LABELS: Record<ProjectDesignAuthorizationStatus, string> = {
  PENDING: "待授权",
  ACCEPTED: "已授权",
  REJECTED: "已拒绝",
  REVOKED: "已撤回"
};

export const PROJECT_MILESTONE_STATUS_LABELS: Record<ProjectMilestoneStatus, string> = {
  TODO: "待开始",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  BLOCKED: "受阻"
};

export const PROJECT_ISSUE_STATUS_LABELS: Record<ProjectIssueStatus, string> = {
  OPEN: "待处理",
  REVIEWING: "处理中",
  RESOLVED: "已解决",
  DISMISSED: "已关闭"
};

export const PROJECT_ISSUE_TYPE_LABELS: Record<ProjectIssueType, string> = {
  NO_UPDATE: "长时间没有更新",
  DELAY: "项目延期",
  OWNER_UNREACHABLE: "项目负责人失联",
  QUALITY_CONCERN: "质量问题",
  DESCRIPTION_MISMATCH: "与页面描述不符",
  COPYRIGHT: "原创或版权问题",
  PROVIDER_BREACH: "服务商未按约履行",
  OTHER: "其他问题"
};

export const PROJECT_PRODUCT_STATUS_LABELS: Record<ProjectProductStatus, string> = {
  DRAFT: "草稿",
  REVIEWING: "审核中",
  APPROVED: "已通过",
  PREORDER_OPEN: "开放预订",
  PAUSED: "已暂停",
  SOLD_OUT: "已售罄",
  ARCHIVED: "已归档"
};

export const PROJECT_ORDER_PAYMENT_STATUS_LABELS: Record<ProjectOrderPaymentStatus, string> = {
  UNPAID: "未付款",
  PENDING: "人工确认中",
  PAID: "已付款",
  FAILED: "支付失败",
  REFUNDED: "已退款",
  PARTIALLY_REFUNDED: "部分退款"
};

export const PROJECT_ORDER_FULFILLMENT_STATUS_LABELS: Record<ProjectOrderFulfillmentStatus, string> = {
  NOT_STARTED: "未开始",
  PRODUCTION: "生产中",
  QUALITY_CHECK: "质检中",
  READY_TO_SHIP: "待发货",
  SHIPPED: "已发货",
  DELIVERED: "已送达",
  EXCEPTION: "异常"
};

export type ProjectUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

export type ProjectAccessShape = {
  designerId?: string | null;
  ownerUserId?: string | null;
  createdById?: string | null;
  visibility?: CollaborationProjectVisibility | null;
  status: CollaborationProjectStatus;
  work?: { userId?: string | null } | null;
};

export type DesignAuthorizationShape = {
  designerUserId: string;
  ownerUserId: string;
  status: ProjectDesignAuthorizationStatus;
};

export type ManualPaymentActor = ProjectUser & {
  manualPaymentPilotEnabled: boolean;
};

export const MANUAL_PAYMENT_STATUSES = [
  ProjectOrderPaymentStatus.UNPAID,
  ProjectOrderPaymentStatus.PENDING,
  ProjectOrderPaymentStatus.PAID,
  ProjectOrderPaymentStatus.FAILED,
  ProjectOrderPaymentStatus.REFUNDED,
  ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
] as const;

export function isActiveAdmin(user: ProjectUser | null | undefined) {
  return Boolean(user && user.status === "ACTIVE" && user.role === "ADMIN");
}

export function isProjectParticipant(user: ProjectUser | null | undefined, project: ProjectAccessShape) {
  if (!user || user.status !== "ACTIVE") return false;
  return [project.designerId, project.ownerUserId, project.createdById, project.work?.userId].some((id) => id === user.id);
}

export function canViewProject(user: ProjectUser | null | undefined, project: ProjectAccessShape) {
  if (isActiveAdmin(user)) return true;
  if (project.visibility === CollaborationProjectVisibility.PUBLIC && PUBLIC_PROJECT_STATUSES.includes(project.status as (typeof PUBLIC_PROJECT_STATUSES)[number])) return true;
  if (project.visibility === CollaborationProjectVisibility.PARTICIPANTS) return isProjectParticipant(user, project);
  return isProjectParticipant(user, project);
}

export function canManageProject(user: ProjectUser | null | undefined, project: ProjectAccessShape) {
  if (isActiveAdmin(user)) return true;
  return isProjectParticipant(user, project);
}

export function isProjectIssueType(value: unknown): value is ProjectIssueType {
  return typeof value === "string" && Object.values(ProjectIssueType).includes(value as ProjectIssueType);
}

export function projectIssueTypeFromInput(value: unknown) {
  return isProjectIssueType(value) ? value : null;
}

export function canOpenPreorderByAuthorization(status: ProjectDesignAuthorizationStatus | null | undefined) {
  return status === ProjectDesignAuthorizationStatus.ACCEPTED;
}

export function canOpenLimitedPreorder(status: CollaborationProjectStatus, productStatus: ProjectProductStatus, authorizationStatus: ProjectDesignAuthorizationStatus | null | undefined = ProjectDesignAuthorizationStatus.ACCEPTED) {
  const projectReady = status === CollaborationProjectStatus.PREORDER_READY || status === CollaborationProjectStatus.PREORDER_OPEN;
  const productReady = productStatus === ProjectProductStatus.APPROVED || productStatus === ProjectProductStatus.PREORDER_OPEN;
  return projectReady && productReady && canOpenPreorderByAuthorization(authorizationStatus);
}

export function canTransitionProjectStatus(nextStatus: CollaborationProjectStatus, authorizationStatus: ProjectDesignAuthorizationStatus | null | undefined) {
  if (nextStatus === CollaborationProjectStatus.PREORDER_READY || nextStatus === CollaborationProjectStatus.PREORDER_OPEN) {
    return canOpenPreorderByAuthorization(authorizationStatus);
  }
  return true;
}

export function canDesignerRespondToAuthorization(user: ProjectUser | null | undefined, authorization: Pick<DesignAuthorizationShape, "designerUserId">) {
  return Boolean(user && user.status === "ACTIVE" && user.id === authorization.designerUserId);
}

export function ownerCannotRespondToAuthorization(user: ProjectUser | null | undefined, authorization: Pick<DesignAuthorizationShape, "ownerUserId" | "designerUserId">) {
  return Boolean(user && user.id === authorization.ownerUserId && user.id !== authorization.designerUserId);
}

export function nextAuthorizationRequestData(termsVersion: string) {
  return {
    status: ProjectDesignAuthorizationStatus.PENDING,
    requestedAt: new Date(),
    acceptedAt: null,
    revokedAt: null,
    termsVersion
  };
}

export function calculateOrderTotal(unitPrice: number, quantity: number) {
  if (!Number.isInteger(unitPrice) || unitPrice < 0) throw new Error("单价必须是非负整数分值。");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("数量填写有误。");
  return unitPrice * quantity;
}

export function formatMoneyCents(value?: number | null, currency = "CNY") {
  if (value === null || value === undefined) return "待确认";
  const amount = (value / 100).toFixed(2);
  return currency === "CNY" ? `¥${amount}` : `${amount} ${currency}`;
}

export function orderIsEditable(status: ProjectOrderStatus) {
  return status === ProjectOrderStatus.RESERVATION || status === ProjectOrderStatus.INTENT || status === ProjectOrderStatus.PENDING_PAYMENT;
}

export function isManualPaymentStatus(value: unknown): value is ProjectOrderPaymentStatus {
  return typeof value === "string" && MANUAL_PAYMENT_STATUSES.includes(value as (typeof MANUAL_PAYMENT_STATUSES)[number]);
}

export function assertManualPaymentAdminAccess(actor: ManualPaymentActor, nextStatus: ProjectOrderPaymentStatus, reason: string | null | undefined) {
  if (!isActiveAdmin(actor)) {
    return { ok: false as const, error: "只有管理员可以修改付款状态。" };
  }
  if (!actor.manualPaymentPilotEnabled) {
    return { ok: false as const, error: "人工支付试点未开启，不能修改付款状态。" };
  }
  if (!reason?.trim()) {
    return { ok: false as const, error: "人工修改付款状态必须填写原因。" };
  }
  if (!isManualPaymentStatus(nextStatus)) {
    return { ok: false as const, error: "付款状态不允许人工设置。" };
  }
  return { ok: true as const };
}

export function resolveManualPaymentStatusUpdate({
  actor,
  oldStatus,
  requestedStatus,
  reason
}: {
  actor: ManualPaymentActor;
  oldStatus: ProjectOrderPaymentStatus;
  requestedStatus: ProjectOrderPaymentStatus;
  reason?: string | null;
}) {
  if (requestedStatus === oldStatus) {
    return { ok: true as const, changed: false as const, status: oldStatus };
  }

  const access = assertManualPaymentAdminAccess(actor, requestedStatus, reason);
  if (!access.ok) return access;

  return { ok: true as const, changed: true as const, status: requestedStatus };
}
