import assert from "node:assert/strict";

import {
  MemoryIdempotencyStore,
  canonicalFingerprint,
  createOrderIntent,
  evaluateCampaignSettlement,
  handlePaymentCallback,
  planRefund,
} from "../src/lib/commerce/transaction-service";

async function main() {
  assert.equal(canonicalFingerprint({ b: 2, a: 1 }), canonicalFingerprint({ a: 1, b: 2 }));

  const store = new MemoryIdempotencyStore();
  const order = { idempotencyKey: "order-command-0001", orderId: "order-1", amountMinor: 12500, currency: "USD" };
  const concurrent = await Promise.all(Array.from({ length: 24 }, () => createOrderIntent(store, order)));
  assert.equal(concurrent.filter((result) => !result.replayed).length, 1);
  assert.equal(concurrent.filter((result) => result.replayed).length, 23);
  assert.deepEqual(concurrent.map((result) => result.value), Array(24).fill(concurrent[0].value));

  await assert.rejects(
    () => createOrderIntent(store, { ...order, amountMinor: 13000 }),
    /IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD/,
  );

  const callback = {
    idempotencyKey: "provider-callback-0001",
    providerEventId: "evt-1",
    orderId: "order-1",
    currentOrderState: "PAYMENT_PENDING" as const,
    currentPaymentState: "PENDING" as const,
    nextOrderState: "RESERVED" as const,
    nextPaymentState: "AUTHORIZED" as const,
  };
  const callbacks = await Promise.all(Array.from({ length: 32 }, () => handlePaymentCallback(store, callback)));
  assert.equal(callbacks.filter((result) => !result.replayed).length, 1);
  assert.equal(callbacks.filter((result) => result.replayed).length, 31);

  await assert.rejects(
    () => handlePaymentCallback(new MemoryIdempotencyStore(), { ...callback, idempotencyKey: "invalid-callback-01", nextOrderState: "COMPLETED" }),
    /INVALID_ORDER_TRANSITION/,
  );

  const funded = evaluateCampaignSettlement({ state: "ACTIVE", pledgedMinor: 10000, goalMinor: 10000, deadline: new Date("2030-01-02"), now: new Date("2030-01-01") });
  assert.deepEqual(funded, { decision: "MARK_FUNDED", nextState: "FUNDED", intents: [] });
  const failed = evaluateCampaignSettlement({ state: "ACTIVE", pledgedMinor: 9999, goalMinor: 10000, deadline: new Date("2030-01-01"), now: new Date("2030-01-01") });
  assert.deepEqual(failed, { decision: "MARK_FAILED", nextState: "FAILED", intents: [] });
  assert.equal(evaluateCampaignSettlement({ state: "ACTIVE", pledgedMinor: 9999, goalMinor: 10000, deadline: new Date("2030-01-02"), now: new Date("2030-01-01") }).decision, "WAIT");

  assert.deepEqual(planRefund({ orderId: "order-1", paymentAttemptId: "pay-1", paymentState: "CAPTURED", capturedMinor: 12500, alreadyRefundedMinor: 2500, requestedMinor: 10000, reason: "campaign failed" }), {
    kind: "REFUND_PAYMENT", orderId: "order-1", paymentAttemptId: "pay-1", amountMinor: 10000, reason: "campaign failed",
  });
  assert.throws(() => planRefund({ orderId: "order-1", paymentAttemptId: "pay-1", paymentState: "CAPTURED", capturedMinor: 12500, alreadyRefundedMinor: 2500, requestedMinor: 10001, reason: "too much" }), /REFUND_EXCEEDS_CAPTURED_AMOUNT/);

  console.log("transaction service layer tests: PASS");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
