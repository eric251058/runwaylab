import assert from "node:assert/strict";
import {
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
  PresaleCampaignStatus,
  ProjectDesignAuthorizationStatus,
  ProjectOrderFulfillmentStatus,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus,
  ProjectProductStatus
} from "@prisma/client";
import {
  assertLifecycleReason,
  assertPublicPreorderNotice,
  canTransitionLimitedPreorder,
  evaluateLimitedPreorderAdmission,
  evaluateLimitedPreorderDecision,
  orderQualifiesForCampaign,
  planFailedOrderDisposition,
  planGoalReachedOrderDisposition,
  planProductionOrderDisposition,
  summarizeLimitedPreorderOrders,
  type LimitedPreorderAdmissionInput,
  type LifecycleOrder
} from "@/lib/projects/preorder-lifecycle";

const now = new Date("2026-08-16T20:00:00.000Z");
const deadline = new Date("2026-08-30T20:00:00.000Z");

const validAdmission: LimitedPreorderAdmissionInput = {
  campaignId: "campaign_1",
  linkedProjectCount: 1,
  campaignWorkId: "work_1",
  projectWorkId: "work_1",
  workOwnerUserId: "designer_1",
  projectOwnerUserId: "owner_1",
  publicWorkReady: true,
  projectStatus: CollaborationProjectStatus.PREORDER_READY,
  projectVisibility: CollaborationProjectVisibility.PUBLIC,
  projectAuthorizationStatus: ProjectDesignAuthorizationStatus.ACCEPTED,
  authorizationRecordStatus: ProjectDesignAuthorizationStatus.ACCEPTED,
  authorizationPreorderCampaignId: "campaign_1",
  authorizationRecordWorkId: "work_1",
  authorizationDesignerUserId: "designer_1",
  authorizationOwnerUserId: "owner_1",
  authorizationTermsVersion: "v2.3-standard-2026-08",
  demandTargetQuantity: 10,
  confirmedDemandQuantity: 12,
  demandCampaignStatus: PresaleCampaignStatus.ACTIVE,
  preorderStatus: LimitedPreorderStatus.NOT_STARTED,
  preorderQualificationMode: LimitedPreorderQualificationMode.CONFIRMED_ORDER,
  preorderTargetQuantity: 6,
  preorderCapacity: 10,
  preorderDeadline: deadline,
  preorderTermsVersion: "limited-preorder-v1",
  preorderTermsText: "This is a limited preorder, not in-stock merchandise. Production starts only after the stated goal is reached.",
  preorderPaymentInstructions: null,
  products: [
    {
      id: "product_1",
      preorderCampaignId: null,
      title: "Limited jacket",
      description: "A complete preorder product description for buyer review.",
      price: 19_900,
      targetQuantity: 6,
      preorderLimit: 10,
      estimatedShipDate: new Date("2026-10-15T20:00:00.000Z"),
      status: ProjectProductStatus.APPROVED,
      skus: [
        { id: "sku_1", size: "S", color: "Black", capacity: 4, priceOverride: null, enabled: true },
        { id: "sku_2", size: "M", color: "Black", capacity: 6, priceOverride: 20_900, enabled: true },
        { id: "sku_disabled", size: "L", color: "Black", capacity: null, priceOverride: null, enabled: false }
      ]
    }
  ],
  now
};

const admitted = evaluateLimitedPreorderAdmission(validAdmission);
assert.equal(admitted.ok, true, JSON.stringify(admitted.issues));
assert.deepEqual(admitted.launchProductIds, ["product_1"]);
assert.equal(admitted.totalProductLimit, 10);

const resumed = evaluateLimitedPreorderAdmission({
  ...validAdmission,
  preorderStatus: LimitedPreorderStatus.PAUSED,
  products: validAdmission.products.map((product) => ({ ...product, preorderCampaignId: "campaign_1", status: ProjectProductStatus.PAUSED })),
  resume: true
});
assert.equal(resumed.ok, true, JSON.stringify(resumed.issues));

function issueCodes(input: LimitedPreorderAdmissionInput) {
  return new Set(evaluateLimitedPreorderAdmission(input).issues.map((item) => item.code));
}

assert(issueCodes({ ...validAdmission, linkedProjectCount: 2 }).has("PROJECT_LINK"));
assert(issueCodes({ ...validAdmission, projectWorkId: "work_other" }).has("WORK_MISMATCH"));
assert(issueCodes({ ...validAdmission, publicWorkReady: false }).has("WORK_QUALITY"));
assert(issueCodes({ ...validAdmission, projectVisibility: CollaborationProjectVisibility.PRIVATE }).has("PROJECT_VISIBILITY"));
assert(issueCodes({ ...validAdmission, projectStatus: CollaborationProjectStatus.DRAFT }).has("PROJECT_STATUS"));
assert(issueCodes({ ...validAdmission, authorizationRecordStatus: ProjectDesignAuthorizationStatus.PENDING }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, authorizationPreorderCampaignId: "campaign_other" }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, authorizationRecordWorkId: "work_other" }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, authorizationDesignerUserId: "designer_other" }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, authorizationOwnerUserId: "owner_other" }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, authorizationTermsVersion: "v1" }).has("DESIGN_AUTHORIZATION"));
assert(issueCodes({ ...validAdmission, confirmedDemandQuantity: 9 }).has("DEMAND_TARGET"));
assert(issueCodes({ ...validAdmission, demandCampaignStatus: PresaleCampaignStatus.CANCELLED }).has("DEMAND_CAMPAIGN_STATUS"));
assert(issueCodes({ ...validAdmission, preorderTargetQuantity: 11 }).has("TARGET_OVER_CAPACITY"));
assert(issueCodes({ ...validAdmission, preorderDeadline: now }).has("PREORDER_DEADLINE"));
assert(issueCodes({ ...validAdmission, preorderTermsVersion: " " }).has("TERMS_VERSION"));
assert(issueCodes({ ...validAdmission, preorderTermsText: "too short" }).has("TERMS_TEXT"));
assert(issueCodes({
  ...validAdmission,
  preorderQualificationMode: LimitedPreorderQualificationMode.PAID_ORDER,
  preorderPaymentInstructions: "too short"
}).has("PAYMENT_INSTRUCTIONS"));
assert(issueCodes({ ...validAdmission, products: validAdmission.products.map((product) => ({ ...product, skus: [] })) }).has("SKU_REQUIRED"));
assert(issueCodes({
  ...validAdmission,
  products: validAdmission.products.map((product) => ({
    ...product,
    skus: product.skus.map((sku) => sku.enabled ? { ...sku, capacity: 3 } : sku)
  }))
}).has("SKU_LIMIT_MISMATCH"));
assert(issueCodes({
  ...validAdmission,
  products: validAdmission.products.map((product) => ({
    ...product,
    skus: product.skus.map((sku) => sku.enabled ? { ...sku, priceOverride: 0 } : sku)
  }))
}).has("SKU_PRICE"));
assert(issueCodes({
  ...validAdmission,
  preorderCapacity: 11,
  products: validAdmission.products.map((product) => ({ ...product, preorderLimit: 10 }))
}).has("CAMPAIGN_CAPACITY_UNREACHABLE"));

const allStatuses = Object.values(LimitedPreorderStatus);
const allowedTransitions = new Set([
  "NOT_STARTED>OPEN",
  "NOT_STARTED>CANCELLED",
  "OPEN>PAUSED",
  "OPEN>GOAL_REACHED",
  "OPEN>FAILED",
  "OPEN>CANCELLED",
  "PAUSED>OPEN",
  "PAUSED>GOAL_REACHED",
  "PAUSED>FAILED",
  "PAUSED>CANCELLED",
  "GOAL_REACHED>PRODUCTION",
  "GOAL_REACHED>CANCELLED",
  "FAILED>CLOSED",
  "PRODUCTION>CANCELLED",
  "PRODUCTION>CLOSED",
  "CANCELLED>CLOSED"
]);
for (const from of allStatuses) {
  for (const to of allStatuses) {
    assert.equal(
      canTransitionLimitedPreorder(from, to),
      allowedTransitions.has(`${from}>${to}`),
      `unexpected lifecycle transition result for ${from} -> ${to}`
    );
  }
}

assert.equal(assertLifecycleReason("  buyer requested cancellation  "), "buyer requested cancellation");
assert.throws(() => assertLifecycleReason("no"), /至少 4 个字符/);
assert.equal(assertPublicPreorderNotice("  本期预售已暂停接单  "), "本期预售已暂停接单");
assert.throws(() => assertPublicPreorderNotice("停"), /消费者可见状态说明/);

const orders: LifecycleOrder[] = [
  { id: "confirmed_unpaid", quantity: 2, status: ProjectOrderStatus.CONFIRMED, paymentStatus: ProjectOrderPaymentStatus.UNPAID },
  { id: "confirmed_paid", quantity: 3, status: ProjectOrderStatus.CONFIRMED, paymentStatus: ProjectOrderPaymentStatus.PAID },
  { id: "reserved_paid", quantity: 4, status: ProjectOrderStatus.RESERVATION, paymentStatus: ProjectOrderPaymentStatus.PAID },
  { id: "pending_unpaid", quantity: 5, status: ProjectOrderStatus.PENDING_PAYMENT, paymentStatus: ProjectOrderPaymentStatus.PENDING },
  { id: "refund_pending", quantity: 1, status: ProjectOrderStatus.REFUND_PENDING, paymentStatus: ProjectOrderPaymentStatus.PAID }
];

assert.equal(orderQualifiesForCampaign(orders[0], LimitedPreorderQualificationMode.CONFIRMED_ORDER), true);
assert.equal(orderQualifiesForCampaign(orders[0], LimitedPreorderQualificationMode.PAID_ORDER), false);
assert.equal(orderQualifiesForCampaign(orders[1], LimitedPreorderQualificationMode.CONFIRMED_ORDER), true);
assert.equal(orderQualifiesForCampaign(orders[1], LimitedPreorderQualificationMode.PAID_ORDER), true);
assert.equal(orderQualifiesForCampaign(orders[2], LimitedPreorderQualificationMode.PAID_ORDER), false, "payment alone must not qualify an unconfirmed reservation");
assert.equal(orderQualifiesForCampaign({
  quantity: 1,
  status: ProjectOrderStatus.CONFIRMED,
  paymentStatus: ProjectOrderPaymentStatus.REFUNDED
}, LimitedPreorderQualificationMode.CONFIRMED_ORDER), false, "a refunded order must never qualify even in confirmed-intent mode");

assert.deepEqual(summarizeLimitedPreorderOrders(orders, LimitedPreorderQualificationMode.CONFIRMED_ORDER), {
  activeQuantity: 14,
  confirmedQuantity: 5,
  paidQuantity: 8,
  qualifiedQuantity: 5,
  refundPendingQuantity: 1
});
assert.equal(summarizeLimitedPreorderOrders(orders, LimitedPreorderQualificationMode.PAID_ORDER).qualifiedQuantity, 3);

assert.equal(evaluateLimitedPreorderDecision({ qualifiedQuantity: 6, targetQuantity: 6, deadline, now }), LimitedPreorderStatus.GOAL_REACHED);
assert.equal(evaluateLimitedPreorderDecision({ qualifiedQuantity: 5, targetQuantity: 6, deadline, now }), null);
assert.equal(
  evaluateLimitedPreorderDecision({ qualifiedQuantity: 5, targetQuantity: 6, deadline, now: new Date(deadline.getTime() + 1) }),
  LimitedPreorderStatus.FAILED
);
assert.equal(
  evaluateLimitedPreorderDecision({ qualifiedQuantity: 6, targetQuantity: 6, deadline, now: new Date(deadline.getTime() + 1) }),
  LimitedPreorderStatus.GOAL_REACHED,
  "a goal reached by the deadline must not be downgraded to failed"
);

assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.RESERVATION, paymentStatus: ProjectOrderPaymentStatus.UNPAID }), "CANCEL");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.CONFIRMED, paymentStatus: ProjectOrderPaymentStatus.PAID }), "REFUND_PENDING");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.CONFIRMED, paymentStatus: ProjectOrderPaymentStatus.PARTIALLY_REFUNDED }), "REFUND_PENDING");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.CANCELLED, paymentStatus: ProjectOrderPaymentStatus.PAID }), "REFUND_PENDING");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.CANCELLED, paymentStatus: ProjectOrderPaymentStatus.UNPAID }), "NOOP");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.REFUNDED, paymentStatus: ProjectOrderPaymentStatus.REFUNDED }), "NOOP");
assert.equal(planFailedOrderDisposition({ quantity: 1, status: ProjectOrderStatus.PRODUCTION, paymentStatus: ProjectOrderPaymentStatus.PAID }), "MANUAL_REVIEW");
assert.equal(planFailedOrderDisposition({
  quantity: 1,
  status: ProjectOrderStatus.CONFIRMED,
  paymentStatus: ProjectOrderPaymentStatus.PAID,
  fulfillmentStatus: ProjectOrderFulfillmentStatus.QUALITY_CHECK
}), "MANUAL_REVIEW");

assert.equal(planGoalReachedOrderDisposition(orders[0], LimitedPreorderQualificationMode.CONFIRMED_ORDER), "NOOP");
assert.equal(planGoalReachedOrderDisposition(orders[0], LimitedPreorderQualificationMode.PAID_ORDER), "CANCEL");
assert.equal(planGoalReachedOrderDisposition(orders[1], LimitedPreorderQualificationMode.PAID_ORDER), "NOOP");
assert.equal(planGoalReachedOrderDisposition(orders[2], LimitedPreorderQualificationMode.PAID_ORDER), "MANUAL_REVIEW");

assert.equal(planProductionOrderDisposition(orders[1], LimitedPreorderQualificationMode.PAID_ORDER), "PRODUCTION");
assert.equal(planProductionOrderDisposition(orders[0], LimitedPreorderQualificationMode.PAID_ORDER), "NOOP");
assert.equal(planProductionOrderDisposition({
  quantity: 1,
  status: ProjectOrderStatus.PRODUCTION,
  paymentStatus: ProjectOrderPaymentStatus.PAID,
  fulfillmentStatus: ProjectOrderFulfillmentStatus.PRODUCTION
}, LimitedPreorderQualificationMode.PAID_ORDER), "NOOP");

console.log("limited preorder lifecycle rules tests: PASS");
