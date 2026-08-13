import assert from "node:assert/strict";
import {
  CAMPAIGN_TRANSITIONS,
  FULFILLMENT_TRANSITIONS,
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  assertCommerceSnapshot,
  assertIdempotencyKey,
  assertTransition,
  calculateOrderTotalMinor,
  canTransition,
  getCommerceContract,
} from "../src/lib/commerce/order-state-machine";

assert.equal(calculateOrderTotalMinor(12900, 3), 38700);
assert.throws(() => calculateOrderTotalMinor(-1, 1), /UNIT_PRICE/);
assert.throws(() => calculateOrderTotalMinor(1, 0), /QUANTITY/);
assert.throws(() => calculateOrderTotalMinor(1, 101), /QUANTITY/);
assert.throws(() => calculateOrderTotalMinor(Number.MAX_SAFE_INTEGER, 2), /OVERFLOW/);

assert.equal(assertIdempotencyKey("order:buyer_01:request_123456"), "order:buyer_01:request_123456");
assert.throws(() => assertIdempotencyKey("short"), /INVALID_IDEMPOTENCY_KEY/);
assert.throws(() => assertIdempotencyKey("unsafe key with spaces"), /INVALID_IDEMPOTENCY_KEY/);

assert.equal(canTransition(CAMPAIGN_TRANSITIONS, "ACTIVE", "FUNDED"), true);
assert.equal(canTransition(CAMPAIGN_TRANSITIONS, "CLOSED", "ACTIVE"), false);
assert.equal(canTransition(ORDER_TRANSITIONS, "RESERVED", "CONFIRMED"), true);
assert.equal(canTransition(PAYMENT_TRANSITIONS, "CAPTURED", "REFUNDED"), false);
assert.equal(canTransition(FULFILLMENT_TRANSITIONS, "QUALITY_CHECK", "PRODUCING"), true);
assert.throws(
  () => assertTransition(ORDER_TRANSITIONS, "COMPLETED", "CANCELLED", "order"),
  /INVALID_ORDER_TRANSITION/,
);

assert.doesNotThrow(() =>
  assertCommerceSnapshot({
    campaign: "CLOSED",
    order: "COMPLETED",
    payment: "CAPTURED",
    fulfillment: "DELIVERED",
  }),
);
assert.doesNotThrow(() =>
  assertCommerceSnapshot({
    campaign: "FAILED",
    order: "RESERVED",
    payment: "AUTHORIZED",
    fulfillment: "NOT_STARTED",
  }),
);
assert.throws(
  () =>
    assertCommerceSnapshot({
      campaign: "ACTIVE",
      order: "PRODUCTION",
      payment: "CAPTURED",
      fulfillment: "PRODUCING",
    }),
  /FUNDED_CAMPAIGN/,
);
assert.throws(
  () =>
    assertCommerceSnapshot({
      campaign: "FAILED",
      order: "CANCELLED",
      payment: "REFUNDED",
      fulfillment: "QUEUED",
    }),
  /FULFILLMENT_REQUIRES_CAPTURED_PAYMENT/,
);
assert.throws(
  () =>
    assertCommerceSnapshot({
      campaign: "CLOSED",
      order: "COMPLETED",
      payment: "AUTHORIZED",
      fulfillment: "DELIVERED",
    }),
  /COMPLETED_ORDER/,
);

const contract = getCommerceContract();
assert.equal(contract.version, "2.1.0");
assert.equal(contract.money.floatingPointForbidden, true);
assert.deepEqual(contract.idempotency.requiredFor, [
  "create-order",
  "create-payment",
  "payment-webhook",
  "refund",
]);

console.log("limited-preorder-transaction-core-tests: PASS");
