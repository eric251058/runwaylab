import { createHash } from "node:crypto";

import {
  assertIdempotencyKey,
  assertTransition,
  CAMPAIGN_TRANSITIONS,
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  type CampaignState,
  type OrderState,
  type PaymentState,
} from "./order-state-machine";

export type TransactionIntent =
  | { kind: "AUTHORIZE_PAYMENT"; orderId: string; amountMinor: number; currency: string }
  | { kind: "CAPTURE_PAYMENT"; orderId: string; paymentAttemptId: string }
  | { kind: "REFUND_PAYMENT"; orderId: string; paymentAttemptId: string; amountMinor: number; reason: string };

export type IdempotentResult<T> =
  | { replayed: false; value: T }
  | { replayed: true; value: T };

export interface IdempotencyStore {
  runOnce<T>(scope: string, key: string, fingerprint: string, operation: () => Promise<T>): Promise<IdempotentResult<T>>;
}

export function canonicalFingerprint(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, { fingerprint: string; value: unknown }>();
  private readonly queues = new Map<string, Promise<void>>();

  async runOnce<T>(scope: string, key: string, fingerprint: string, operation: () => Promise<T>): Promise<IdempotentResult<T>> {
    assertIdempotencyKey(key);
    const compoundKey = `${scope}:${key}`;
    const previous = this.queues.get(compoundKey) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    this.queues.set(compoundKey, queued);
    await previous;
    try {
      const existing = this.records.get(compoundKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD");
        return { replayed: true, value: existing.value as T };
      }
      const value = await operation();
      this.records.set(compoundKey, { fingerprint, value });
      return { replayed: false, value };
    } finally {
      release();
      if (this.queues.get(compoundKey) === queued) this.queues.delete(compoundKey);
    }
  }
}

export interface CreateOrderCommand {
  idempotencyKey: string;
  orderId: string;
  amountMinor: number;
  currency: string;
}

export async function createOrderIntent(store: IdempotencyStore, command: CreateOrderCommand): Promise<IdempotentResult<TransactionIntent>> {
  if (!command.orderId.trim()) throw new Error("ORDER_ID_REQUIRED");
  if (!Number.isSafeInteger(command.amountMinor) || command.amountMinor <= 0) throw new Error("INVALID_AMOUNT_MINOR");
  if (!/^[A-Z]{3}$/.test(command.currency)) throw new Error("INVALID_CURRENCY");
  return store.runOnce("create-order", command.idempotencyKey, canonicalFingerprint(command), async () => ({
    kind: "AUTHORIZE_PAYMENT",
    orderId: command.orderId,
    amountMinor: command.amountMinor,
    currency: command.currency,
  }));
}

export interface PaymentCallbackCommand {
  idempotencyKey: string;
  providerEventId: string;
  orderId: string;
  currentOrderState: OrderState;
  currentPaymentState: PaymentState;
  nextOrderState: OrderState;
  nextPaymentState: PaymentState;
}

export async function handlePaymentCallback(store: IdempotencyStore, command: PaymentCallbackCommand): Promise<IdempotentResult<{ orderState: OrderState; paymentState: PaymentState }>> {
  if (!command.providerEventId.trim()) throw new Error("PROVIDER_EVENT_ID_REQUIRED");
  return store.runOnce("payment-callback", command.idempotencyKey, canonicalFingerprint(command), async () => {
    assertTransition(ORDER_TRANSITIONS, command.currentOrderState, command.nextOrderState, "order");
    assertTransition(PAYMENT_TRANSITIONS, command.currentPaymentState, command.nextPaymentState, "payment");
    return { orderState: command.nextOrderState, paymentState: command.nextPaymentState };
  });
}

export function evaluateCampaignSettlement(input: {
  state: CampaignState;
  pledgedMinor: number;
  goalMinor: number;
  deadline: Date;
  now: Date;
}): { decision: "WAIT" | "MARK_FUNDED" | "MARK_FAILED"; nextState: CampaignState; intents: TransactionIntent[] } {
  if (!Number.isSafeInteger(input.pledgedMinor) || input.pledgedMinor < 0) throw new Error("INVALID_PLEDGED_MINOR");
  if (!Number.isSafeInteger(input.goalMinor) || input.goalMinor <= 0) throw new Error("INVALID_GOAL_MINOR");
  if (input.state !== "ACTIVE") return { decision: "WAIT", nextState: input.state, intents: [] };
  if (input.pledgedMinor >= input.goalMinor) {
    assertTransition(CAMPAIGN_TRANSITIONS, input.state, "FUNDED", "campaign");
    return { decision: "MARK_FUNDED", nextState: "FUNDED", intents: [] };
  }
  if (input.now.getTime() >= input.deadline.getTime()) {
    assertTransition(CAMPAIGN_TRANSITIONS, input.state, "FAILED", "campaign");
    return { decision: "MARK_FAILED", nextState: "FAILED", intents: [] };
  }
  return { decision: "WAIT", nextState: input.state, intents: [] };
}

export function planRefund(input: {
  orderId: string;
  paymentAttemptId: string;
  paymentState: PaymentState;
  capturedMinor: number;
  alreadyRefundedMinor: number;
  requestedMinor: number;
  reason: string;
}): TransactionIntent {
  if (input.paymentState !== "CAPTURED" && input.paymentState !== "REFUND_PENDING") throw new Error("PAYMENT_NOT_REFUNDABLE");
  for (const amount of [input.capturedMinor, input.alreadyRefundedMinor, input.requestedMinor]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("INVALID_REFUND_AMOUNT");
  }
  if (input.requestedMinor <= 0 || input.alreadyRefundedMinor + input.requestedMinor > input.capturedMinor) throw new Error("REFUND_EXCEEDS_CAPTURED_AMOUNT");
  if (!input.reason.trim()) throw new Error("REFUND_REASON_REQUIRED");
  return { kind: "REFUND_PAYMENT", orderId: input.orderId, paymentAttemptId: input.paymentAttemptId, amountMinor: input.requestedMinor, reason: input.reason.trim() };
}
