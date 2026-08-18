import {
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  PresaleCampaignStatus,
  ProjectDesignAuthorizationStatus,
  ProjectOrderConfirmationChannel,
  ProjectOrderFulfillmentStatus,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus,
  ProjectProductStatus
} from "@prisma/client";
import { PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION } from "@/lib/projects/design-authorization-policy";
import { readProjectOrderProductSnapshot } from "@/lib/projects/order-snapshots";

export const LIMITED_PREORDER_STATUS_LABELS: Record<LimitedPreorderStatus, string> = {
  NOT_STARTED: "未开始",
  OPEN: "预售开放中",
  PAUSED: "已暂停",
  GOAL_REACHED: "已达标",
  FAILED: "未达标关闭",
  PRODUCTION: "生产中",
  CANCELLED: "已取消",
  CLOSED: "已结束"
};

export const LIMITED_PREORDER_QUALIFICATION_LABELS: Record<LimitedPreorderQualificationMode, string> = {
  CONFIRMED_ORDER: "已人工确认的真实订单意向",
  PAID_ORDER: "已确认付款的订单"
};

export const LIMITED_PREORDER_NO_PAYMENT_NOTICE =
  "本期仅记录经平台人工核验的真实订单意向，不在线收款、不收定金，也不提供线下转账指引。";

const NEGATED_PAYMENT_LANGUAGE = /(?:不|未|无需|无须|不会|不得|禁止|请勿|不可|不必)[^。；，,！？!\n]{0,12}(?:收款|付款|支付|转账|汇款|打款|缴费|付费|订金|定金)/gi;
const PAYMENT_SOLICITATION_PATTERNS = [
  /(?:收款|付款|支付|转账|汇款|打款|缴费|付费|订金|定金)/i,
  /(?:收款码|二维码|扫码|银行卡号|银行账号|个人账户|付款链接|支付链接|收款信息|付款方式|支付方式)/i
] as const;

export function assertNoLimitedPreorderPaymentSolicitation(value: string, label = "消费者可见内容") {
  // Explicitly negative disclosures such as “不收定金” are required and
  // safe. Everything else that asks for or routes money fails closed.
  const textToInspect = value.replace(NEGATED_PAYMENT_LANGUAGE, "");
  if (PAYMENT_SOLICITATION_PATTERNS.some((pattern) => pattern.test(textToInspect))) {
    throw new Error(`${label}不得包含转账、定金、收款码或其他付款指引。`);
  }
  return value;
}

export function normalizeLimitedPreorderNoPaymentTerms(value: string) {
  const terms = assertNoLimitedPreorderPaymentSolicitation(value.trim(), "预售条款");
  return terms.includes(LIMITED_PREORDER_NO_PAYMENT_NOTICE)
    ? terms
    : `${LIMITED_PREORDER_NO_PAYMENT_NOTICE}\n\n${terms}`;
}

const CAMPAIGN_TRANSITIONS: Record<LimitedPreorderStatus, readonly LimitedPreorderStatus[]> = {
  NOT_STARTED: [LimitedPreorderStatus.OPEN, LimitedPreorderStatus.CANCELLED],
  OPEN: [LimitedPreorderStatus.PAUSED, LimitedPreorderStatus.GOAL_REACHED, LimitedPreorderStatus.FAILED, LimitedPreorderStatus.CANCELLED],
  PAUSED: [LimitedPreorderStatus.OPEN, LimitedPreorderStatus.GOAL_REACHED, LimitedPreorderStatus.FAILED, LimitedPreorderStatus.CANCELLED],
  GOAL_REACHED: [LimitedPreorderStatus.PRODUCTION, LimitedPreorderStatus.CANCELLED],
  FAILED: [LimitedPreorderStatus.CLOSED],
  PRODUCTION: [LimitedPreorderStatus.CANCELLED, LimitedPreorderStatus.CLOSED],
  CANCELLED: [LimitedPreorderStatus.CLOSED],
  CLOSED: []
};

export function canTransitionLimitedPreorder(from: LimitedPreorderStatus, to: LimitedPreorderStatus) {
  return CAMPAIGN_TRANSITIONS[from].includes(to);
}

export function assertLifecycleReason(value: string | null | undefined) {
  const reason = value?.trim();
  if (!reason || reason.length < 4) throw new Error("生命周期操作必须填写至少 4 个字符的原因。");
  return reason.slice(0, 500);
}

export function assertPublicPreorderNotice(value: string | null | undefined) {
  const notice = value?.trim();
  if (!notice || notice.length < 4) throw new Error("生命周期操作必须填写至少 4 个字符的消费者可见状态说明。");
  return assertNoLimitedPreorderPaymentSolicitation(notice.slice(0, 500), "消费者可见状态说明");
}

export type AdmissionSku = {
  id: string;
  size: string;
  color: string;
  capacity: number | null;
  priceOverride: number | null;
  enabled: boolean;
};

export type AdmissionProduct = {
  id: string;
  preorderCampaignId: string | null;
  title: string;
  description: string | null;
  materialDescription: string | null;
  careInstructions: string | null;
  imageStage: string | null;
  price: number;
  targetQuantity: number | null;
  preorderLimit: number | null;
  estimatedShipDate: Date | null;
  status: ProjectProductStatus;
  skus: AdmissionSku[];
};

export type LimitedPreorderAuthorizationInput = {
  campaignId: string;
  campaignWorkId: string;
  projectWorkId: string | null;
  workOwnerUserId: string | null;
  projectOwnerUserId: string | null;
  projectAuthorizationStatus: ProjectDesignAuthorizationStatus;
  authorizationRecordStatus: ProjectDesignAuthorizationStatus | null;
  authorizationPreorderCampaignId: string | null;
  authorizationRecordWorkId: string | null;
  authorizationDesignerUserId: string | null;
  authorizationOwnerUserId: string | null;
  authorizationTermsVersion: string | null;
  authorizationOfferHash: string | null;
  currentOfferHash: string | null;
};

export function hasCurrentLimitedPreorderAuthorization(input: LimitedPreorderAuthorizationInput) {
  return Boolean(
    input.projectOwnerUserId
    && input.projectAuthorizationStatus === ProjectDesignAuthorizationStatus.ACCEPTED
    && input.authorizationRecordStatus === ProjectDesignAuthorizationStatus.ACCEPTED
    && input.authorizationTermsVersion === PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION
    && Boolean(input.authorizationOfferHash)
    && input.authorizationOfferHash === input.currentOfferHash
    && input.authorizationPreorderCampaignId === input.campaignId
    && input.authorizationRecordWorkId === input.campaignWorkId
    && input.authorizationRecordWorkId === input.projectWorkId
    && input.authorizationDesignerUserId === input.workOwnerUserId
    && input.authorizationOwnerUserId === input.projectOwnerUserId
  );
}

export type LimitedPreorderAdmissionInput = LimitedPreorderAuthorizationInput & {
  linkedProjectCount: number;
  publicWorkReady: boolean;
  projectStatus: CollaborationProjectStatus;
  projectVisibility: CollaborationProjectVisibility;
  demandTargetQuantity: number;
  confirmedDemandQuantity: number;
  demandCampaignStatus: PresaleCampaignStatus;
  preorderStatus: LimitedPreorderStatus;
  preorderQualificationMode: LimitedPreorderQualificationMode;
  preorderTargetQuantity: number | null;
  preorderCapacity: number | null;
  preorderDeadline: Date | null;
  preorderTermsVersion: string;
  preorderTermsText: string | null;
  preorderPaymentInstructions: string | null;
  products: AdmissionProduct[];
  now?: Date;
  resume?: boolean;
};

export type AdmissionIssue = { code: string; message: string };

function issue(code: string, message: string): AdmissionIssue {
  return { code, message };
}

export function evaluateLimitedPreorderAdmission(input: LimitedPreorderAdmissionInput) {
  const now = input.now ?? new Date();
  const issues: AdmissionIssue[] = [];
  const expectedCampaignStatus = input.resume ? LimitedPreorderStatus.PAUSED : LimitedPreorderStatus.NOT_STARTED;
  const expectedProductStatus = input.resume ? ProjectProductStatus.PAUSED : ProjectProductStatus.APPROVED;

  if (input.preorderStatus !== expectedCampaignStatus) {
    issues.push(issue("CAMPAIGN_STATUS", input.resume ? "只有已暂停的限量预售可以恢复。" : "该活动已经进入限量预售生命周期。"));
  }
  if (input.linkedProjectCount !== 1) issues.push(issue("PROJECT_LINK", "活动必须且只能关联一个协作项目。"));
  if (!input.projectWorkId || input.projectWorkId !== input.campaignWorkId) issues.push(issue("WORK_MISMATCH", "活动、项目与作品关联不一致。"));
  if (!input.publicWorkReady) issues.push(issue("WORK_QUALITY", "作品尚未达到公开质量门槛。"));
  if (input.projectVisibility !== CollaborationProjectVisibility.PUBLIC) issues.push(issue("PROJECT_VISIBILITY", "协作项目必须公开可见。"));
  if (input.projectStatus !== CollaborationProjectStatus.PREORDER_READY) issues.push(issue("PROJECT_STATUS", "协作项目必须处于预售准备完成状态。"));
  if (!hasCurrentLimitedPreorderAuthorization(input)) {
    issues.push(issue("DESIGN_AUTHORIZATION", "必须由当前项目负责人向当前作品作者发送本期标准授权，并由作者接受；旧版、错绑或已失效授权不能用于 V2.3 开售与生产。"));
  }
  if (input.demandTargetQuantity < 1 || input.confirmedDemandQuantity < input.demandTargetQuantity) {
    issues.push(issue("DEMAND_TARGET", "V2.1 人工确认需求尚未达到需求验证目标。"));
  }
  const eligibleDemandStatuses: readonly PresaleCampaignStatus[] = [PresaleCampaignStatus.ACTIVE, PresaleCampaignStatus.COMPLETED];
  if (!eligibleDemandStatuses.includes(input.demandCampaignStatus)) {
    issues.push(issue("DEMAND_CAMPAIGN_STATUS", "V2.1 需求活动必须处于有效或已完成状态；草稿、暂停或取消的活动不能直接转为限量预售。"));
  }
  if (!Number.isInteger(input.preorderTargetQuantity) || (input.preorderTargetQuantity ?? 0) < 1) issues.push(issue("PREORDER_TARGET", "必须设置有效的预售成团目标。"));
  if (!Number.isInteger(input.preorderCapacity) || (input.preorderCapacity ?? 0) < 1) issues.push(issue("PREORDER_CAPACITY", "必须设置有效的活动限量。"));
  if ((input.preorderTargetQuantity ?? 0) > (input.preorderCapacity ?? 0)) issues.push(issue("TARGET_OVER_CAPACITY", "预售成团目标不能大于活动限量。"));
  if (!input.preorderDeadline || input.preorderDeadline <= now) issues.push(issue("PREORDER_DEADLINE", "预售截止时间必须晚于当前时间。"));
  if (!input.preorderTermsVersion.trim()) issues.push(issue("TERMS_VERSION", "必须锁定预售条款版本。"));
  if (!input.preorderTermsText || input.preorderTermsText.trim().length < 40) {
    issues.push(issue("TERMS_TEXT", "必须锁定至少 40 个字符的预售条款正文，不能只记录版本号。"));
  }
  if (
    input.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER
    && !input.preorderTermsText?.includes(LIMITED_PREORDER_NO_PAYMENT_NOTICE)
  ) {
    issues.push(issue("NO_PAYMENT_NOTICE", "首期条款必须包含不可删除的“不在线收款、不收定金、不提供线下转账指引”说明。"));
  }
  if (
    input.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER
    && (!input.preorderPaymentInstructions || input.preorderPaymentInstructions.trim().length < 20)
  ) {
    issues.push(issue("PAYMENT_INSTRUCTIONS", "按付款成团时必须提供至少 20 个字符的明确付款和人工确认指引。"));
  }
  if (
    input.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER
    && input.preorderPaymentInstructions?.trim()
  ) {
    issues.push(issue("PAYMENT_DISABLED", "首期人工确认订单意向不收款，不得配置转账、定金或其他付款指引。"));
  }

  const launchProducts = input.products.filter((product) => (
    product.status === expectedProductStatus
    && (input.resume
      ? product.preorderCampaignId === input.campaignId
      : !product.preorderCampaignId || product.preorderCampaignId === input.campaignId)
  ));
  if (!launchProducts.length) issues.push(issue("PRODUCTS", input.resume ? "没有可恢复开放的已暂停商品。" : "至少需要一个审核通过的商品。"));

  for (const product of launchProducts) {
    const prefix = `商品“${product.title || product.id}”`;
    if (!product.title.trim() || !product.description || product.description.trim().length < 20) issues.push(issue("PRODUCT_DESCRIPTION", `${prefix}需要标题及至少 20 字说明。`));
    if (!product.materialDescription || product.materialDescription.trim().length < 10) issues.push(issue("PRODUCT_MATERIAL", `${prefix}需要至少 10 字的面料与工艺说明。`));
    if (!product.careInstructions || product.careInstructions.trim().length < 10) issues.push(issue("PRODUCT_CARE", `${prefix}需要至少 10 字的护理说明。`));
    if (!product.imageStage || product.imageStage.trim().length < 2) issues.push(issue("PRODUCT_IMAGE_STAGE", `${prefix}必须说明消费者所见图片的真实阶段。`));
    if (!Number.isInteger(product.price) || product.price <= 0) issues.push(issue("PRODUCT_PRICE", `${prefix}价格必须为正整数最小货币单位。`));
    if (!Number.isInteger(product.targetQuantity) || (product.targetQuantity ?? 0) < 1) issues.push(issue("PRODUCT_TARGET", `${prefix}必须设置有效目标量。`));
    if (!Number.isInteger(product.preorderLimit) || (product.preorderLimit ?? 0) < 1) issues.push(issue("PRODUCT_LIMIT", `${prefix}必须设置独立的硬限量。`));
    if ((product.targetQuantity ?? 0) > (product.preorderLimit ?? 0)) issues.push(issue("PRODUCT_TARGET_OVER_LIMIT", `${prefix}目标量不能大于硬限量。`));
    if (!product.estimatedShipDate || !input.preorderDeadline || product.estimatedShipDate <= input.preorderDeadline) {
      issues.push(issue("ESTIMATED_SHIP_DATE", `${prefix}预计发货时间必须晚于预售截止时间。`));
    }

    const enabledSkus = product.skus.filter((sku) => sku.enabled);
    if (!enabledSkus.length) issues.push(issue("SKU_REQUIRED", `${prefix}至少需要一个启用的 SKU。`));
    let skuCapacity = 0;
    for (const sku of enabledSkus) {
      if (!sku.size.trim() || !sku.color.trim()) issues.push(issue("SKU_OPTION", `${prefix}存在缺少尺码或颜色的 SKU。`));
      if (!Number.isInteger(sku.capacity) || (sku.capacity ?? 0) < 1) issues.push(issue("SKU_CAPACITY", `${prefix}的每个启用 SKU 都必须设置正整数容量。`));
      if (sku.priceOverride !== null && (!Number.isInteger(sku.priceOverride) || sku.priceOverride <= 0)) {
        issues.push(issue("SKU_PRICE", `${prefix}的 SKU 覆盖价格必须留空或为正整数最小货币单位。`));
      }
      skuCapacity += sku.capacity ?? 0;
    }
    if (enabledSkus.length && skuCapacity !== product.preorderLimit) {
      issues.push(issue("SKU_LIMIT_MISMATCH", `${prefix}启用 SKU 容量合计必须等于商品硬限量。`));
    }
  }

  const totalProductLimit = launchProducts.reduce((sum, product) => sum + (product.preorderLimit ?? 0), 0);
  if ((input.preorderCapacity ?? 0) > totalProductLimit) issues.push(issue("CAMPAIGN_CAPACITY_UNREACHABLE", "活动限量不能大于开售商品硬限量合计。"));
  if ((input.preorderTargetQuantity ?? 0) > totalProductLimit) issues.push(issue("CAMPAIGN_TARGET_UNREACHABLE", "预售成团目标不能大于开售商品硬限量合计。"));

  return { ok: issues.length === 0, issues, launchProductIds: launchProducts.map((product) => product.id), totalProductLimit };
}

export type LifecycleOrder = {
  id?: string;
  quantity: number;
  status: ProjectOrderStatus;
  paymentStatus: ProjectOrderPaymentStatus;
  fulfillmentStatus?: ProjectOrderFulfillmentStatus;
  confirmedAt?: Date | null;
  confirmedById?: string | null;
  confirmationChannel?: ProjectOrderConfirmationChannel | null;
  confirmationEvidenceRef?: string | null;
  confirmationSummary?: string | null;
  productSnapshot?: unknown;
};

const CONFIRMED_QUALIFYING_STATUSES = [ProjectOrderStatus.CONFIRMED] as const;
const OPEN_ORDER_STATUSES = [
  ProjectOrderStatus.RESERVATION,
  ProjectOrderStatus.PENDING_PAYMENT,
  ProjectOrderStatus.CONFIRMED
] as const;

export function orderQualifiesForCampaign(
  order: LifecycleOrder,
  mode: LimitedPreorderQualificationMode,
  expectedOfferHash: string | null
) {
  const submissionOfferHash = readProjectOrderProductSnapshot(order.productSnapshot).submissionOfferHash;
  if (!expectedOfferHash || submissionOfferHash !== expectedOfferHash) return false;
  if (!CONFIRMED_QUALIFYING_STATUSES.includes(order.status as (typeof CONFIRMED_QUALIFYING_STATUSES)[number])) return false;
  if (order.paymentStatus === ProjectOrderPaymentStatus.REFUNDED || order.paymentStatus === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED) return false;
  if (
    !order.confirmedAt
    || !order.confirmedById
    || !order.confirmationChannel
    || !order.confirmationEvidenceRef?.trim()
    || !order.confirmationSummary?.trim()
  ) return false;
  return mode === LimitedPreorderQualificationMode.CONFIRMED_ORDER || order.paymentStatus === ProjectOrderPaymentStatus.PAID;
}

export function summarizeLimitedPreorderOrders(
  orders: readonly LifecycleOrder[],
  mode: LimitedPreorderQualificationMode,
  expectedOfferHash: string | null
) {
  return orders.reduce((summary, order) => {
    if (OPEN_ORDER_STATUSES.includes(order.status as (typeof OPEN_ORDER_STATUSES)[number])) summary.activeQuantity += order.quantity;
    if (order.status === ProjectOrderStatus.CONFIRMED) summary.confirmedQuantity += order.quantity;
    if (order.paymentStatus === ProjectOrderPaymentStatus.PAID) summary.paidQuantity += order.quantity;
    if (orderQualifiesForCampaign(order, mode, expectedOfferHash)) summary.qualifiedQuantity += order.quantity;
    if (order.status === ProjectOrderStatus.REFUND_PENDING) summary.refundPendingQuantity += order.quantity;
    return summary;
  }, { activeQuantity: 0, confirmedQuantity: 0, paidQuantity: 0, qualifiedQuantity: 0, refundPendingQuantity: 0 });
}

export function evaluateLimitedPreorderDecision({
  qualifiedQuantity,
  targetQuantity,
  deadline,
  now = new Date()
}: {
  qualifiedQuantity: number;
  targetQuantity: number;
  deadline: Date;
  now?: Date;
}) {
  if (qualifiedQuantity >= targetQuantity) return LimitedPreorderStatus.GOAL_REACHED;
  if (now >= deadline) return LimitedPreorderStatus.FAILED;
  return null;
}

export type OrderDisposition = "NOOP" | "CANCEL" | "CONFIRM" | "REFUND_PENDING" | "PRODUCTION" | "MANUAL_REVIEW";

function hasMoneyToReturn(paymentStatus: ProjectOrderPaymentStatus) {
  return paymentStatus === ProjectOrderPaymentStatus.PAID || paymentStatus === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED;
}

export function planFailedOrderDisposition(order: LifecycleOrder): OrderDisposition {
  const irreversibleStatuses: readonly ProjectOrderStatus[] = [ProjectOrderStatus.PRODUCTION, ProjectOrderStatus.SHIPPED, ProjectOrderStatus.COMPLETED];
  if (order.status === ProjectOrderStatus.REFUND_PENDING) return "NOOP";
  if (order.status === ProjectOrderStatus.REFUNDED) return order.paymentStatus === ProjectOrderPaymentStatus.REFUNDED ? "NOOP" : "MANUAL_REVIEW";
  if (order.status === ProjectOrderStatus.CANCELLED) return hasMoneyToReturn(order.paymentStatus) ? "REFUND_PENDING" : "NOOP";
  if (irreversibleStatuses.includes(order.status)) return "MANUAL_REVIEW";
  if (order.fulfillmentStatus && order.fulfillmentStatus !== ProjectOrderFulfillmentStatus.NOT_STARTED) return "MANUAL_REVIEW";
  if (hasMoneyToReturn(order.paymentStatus)) return "REFUND_PENDING";
  if ([ProjectOrderPaymentStatus.UNPAID, ProjectOrderPaymentStatus.PENDING, ProjectOrderPaymentStatus.FAILED, ProjectOrderPaymentStatus.REFUNDED].includes(order.paymentStatus)) return "CANCEL";
  return "MANUAL_REVIEW";
}

export function planGoalReachedOrderDisposition(
  order: LifecycleOrder,
  mode: LimitedPreorderQualificationMode,
  expectedOfferHash: string | null
): OrderDisposition {
  if (orderQualifiesForCampaign(order, mode, expectedOfferHash)) return "NOOP";
  if (order.status === ProjectOrderStatus.REFUND_PENDING) return "NOOP";
  if (order.status === ProjectOrderStatus.REFUNDED) return order.paymentStatus === ProjectOrderPaymentStatus.REFUNDED ? "NOOP" : "MANUAL_REVIEW";
  if (hasMoneyToReturn(order.paymentStatus)) return "MANUAL_REVIEW";
  if (order.status === ProjectOrderStatus.CANCELLED) return "NOOP";
  if (OPEN_ORDER_STATUSES.includes(order.status as (typeof OPEN_ORDER_STATUSES)[number])) return "CANCEL";
  return "MANUAL_REVIEW";
}

export function planProductionOrderDisposition(
  order: LifecycleOrder,
  mode: LimitedPreorderQualificationMode,
  expectedOfferHash: string | null
): OrderDisposition {
  if (order.status === ProjectOrderStatus.PRODUCTION && order.fulfillmentStatus === ProjectOrderFulfillmentStatus.PRODUCTION) return "NOOP";
  return orderQualifiesForCampaign(order, mode, expectedOfferHash) ? "PRODUCTION" : "NOOP";
}
