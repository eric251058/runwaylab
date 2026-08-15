export const COMMERCE_CONTRACT_VERSION = "2.1.0" as const;

export type CampaignState =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "FUNDED"
  | "FAILED"
  | "PRODUCTION"
  | "CLOSED"
  | "CANCELLED";

export type OrderState =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "RESERVED"
  | "CONFIRMED"
  | "PRODUCTION"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentState =
  | "UNPAID"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "FAILED";

export type FulfillmentState =
  | "NOT_STARTED"
  | "QUEUED"
  | "PRODUCING"
  | "QUALITY_CHECK"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type TransitionMap<T extends string> = Readonly<Record<T, readonly T[]>>;

export const CAMPAIGN_TRANSITIONS: TransitionMap<CampaignState> = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED"],
  SCHEDULED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["FUNDED", "FAILED", "CANCELLED"],
  FUNDED: ["PRODUCTION", "CANCELLED"],
  FAILED: ["CLOSED"],
  PRODUCTION: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export const ORDER_TRANSITIONS: TransitionMap<OrderState> = {
  CREATED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["RESERVED", "CANCELLED"],
  RESERVED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PRODUCTION", "CANCELLED"],
  PRODUCTION: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: TransitionMap<PaymentState> = {
  UNPAID: ["PENDING", "FAILED"],
  PENDING: ["AUTHORIZED", "CAPTURED", "FAILED"],
  AUTHORIZED: ["CAPTURED", "REFUND_PENDING", "FAILED"],
  CAPTURED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED", "FAILED"],
  REFUNDED: [],
  FAILED: ["PENDING"],
};

export const FULFILLMENT_TRANSITIONS: TransitionMap<FulfillmentState> = {
  NOT_STARTED: ["QUEUED", "CANCELLED"],
  QUEUED: ["PRODUCING", "CANCELLED"],
  PRODUCING: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["PRODUCING", "SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition<T extends string>(
  map: TransitionMap<T>,
  from: T,
  to: T,
): boolean {
  return map[from].includes(to);
}

export function assertTransition<T extends string>(
  map: TransitionMap<T>,
  from: T,
  to: T,
  subject: string,
): void {
  if (!canTransition(map, from, to)) {
    throw new Error(`INVALID_${subject.toUpperCase()}_TRANSITION:${from}->${to}`);
  }
}

export function calculateOrderTotalMinor(unitPriceMinor: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new Error("UNIT_PRICE_MUST_BE_A_NON_NEGATIVE_SAFE_INTEGER");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("QUANTITY_OUT_OF_RANGE");
  }
  const total = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(total)) throw new Error("ORDER_TOTAL_OVERFLOW");
  return total;
}

export function assertIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9:_-]{16,128}$/.test(normalized)) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
  return normalized;
}

export type CommerceSnapshot = Readonly<{
  campaign: CampaignState;
  order: OrderState;
  payment: PaymentState;
  fulfillment: FulfillmentState;
}>;

export function assertCommerceSnapshot(snapshot: CommerceSnapshot): void {
  const { campaign, order, payment, fulfillment } = snapshot;

  if (order === "COMPLETED" && (payment !== "CAPTURED" || fulfillment !== "DELIVERED")) {
    throw new Error("COMPLETED_ORDER_REQUIRES_CAPTURED_PAYMENT_AND_DELIVERY");
  }
  if (order === "PRODUCTION" && !["FUNDED", "PRODUCTION", "CLOSED"].includes(campaign)) {
    throw new Error("PRODUCTION_ORDER_REQUIRES_FUNDED_CAMPAIGN");
  }
  if (fulfillment !== "NOT_STARTED" && fulfillment !== "CANCELLED" && payment !== "CAPTURED") {
    throw new Error("FULFILLMENT_REQUIRES_CAPTURED_PAYMENT");
  }
  if (payment === "REFUNDED" && order !== "CANCELLED") {
    throw new Error("REFUNDED_PAYMENT_REQUIRES_CANCELLED_ORDER");
  }
  if (campaign === "FAILED" && !["CANCELLED", "RESERVED"].includes(order)) {
    throw new Error("FAILED_CAMPAIGN_REQUIRES_CANCELLABLE_ORDER");
  }
}

export function getCommerceContract() {
  return {
    version: COMMERCE_CONTRACT_VERSION,
    money: {
      storage: "minor-unit-integer",
      floatingPointForbidden: true,
      defaultCurrency: "CNY",
    },
    idempotency: {
      requiredFor: ["create-order", "create-payment", "payment-webhook", "refund"],
      replayReturnsOriginalResult: true,
    },
    campaignTransitions: CAMPAIGN_TRANSITIONS,
    orderTransitions: ORDER_TRANSITIONS,
    paymentTransitions: PAYMENT_TRANSITIONS,
    fulfillmentTransitions: FULFILLMENT_TRANSITIONS,
  } as const;
}
