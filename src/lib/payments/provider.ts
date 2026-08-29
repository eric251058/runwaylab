import type { FeatureKey } from "@/lib/features";
import { createAlipayPaymentProviderFromEnv } from "@/lib/payments/alipay";

export type PaymentRequest = {
  orderId: string;
  attemptId?: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl?: string;
  notifyUrl?: string;
};

export type PaymentResult =
  | { ok: true; provider: string; paymentUrl: string; merchantReference: string; message: string }
  | { ok: false; provider: string; reason: string; code?: string };

export type PaymentNotification =
  | {
      ok: true;
      provider: string;
      eventId: string;
      merchantReference: string;
      providerPaymentId: string | null;
      amountCents: number;
      currency: string;
      status: "CAPTURED" | "FAILED";
      capturedAt: Date | null;
    }
  | { ok: false; provider: string; reason: string; code: string };

export type RefundRequest = {
  orderId: string;
  refundId: string;
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  reason: string;
};

export type RefundResult =
  | { ok: true; provider: string; providerRefundId: string; message: string }
  | { ok: false; provider: string; reason: string; code?: string; retryable?: boolean };

export interface PaymentProvider {
  readonly name: string;
  readonly configured: boolean;
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
  verifyNotification(input: Record<string, string>): PaymentNotification;
  refundPayment(input: RefundRequest): Promise<RefundResult>;
}

export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = "disabled";
  readonly configured = false;

  constructor(private readonly disabledReason = "当前仅记录订单，未开启真实支付。") {}

  async createPayment(_input: PaymentRequest): Promise<PaymentResult> {
    return {
      ok: false,
      provider: this.name,
      reason: this.disabledReason,
      code: "PAYMENT_DISABLED"
    };
  }

  verifyNotification(_input: Record<string, string>): PaymentNotification {
    return { ok: false, provider: this.name, reason: this.disabledReason, code: "PAYMENT_DISABLED" };
  }

  async refundPayment(_input: RefundRequest): Promise<RefundResult> {
    return {
      ok: false,
      provider: this.name,
      reason: this.disabledReason,
      code: "PAYMENT_DISABLED"
    };
  }
}

export function createPaymentProvider(
  flags: Partial<Record<FeatureKey, boolean>>,
  nodeEnv = process.env.NODE_ENV,
  env: NodeJS.ProcessEnv = process.env
): PaymentProvider {
  if (!flags["feature.live_payment"]) return new DisabledPaymentProvider();
  if (nodeEnv === "production" && !flags["feature.manual_payment_pilot"]) {
    return new DisabledPaymentProvider("生产支付安全开关尚未同时开启。");
  }
  return createPaymentOperationsProvider(nodeEnv, env);
}

export function createPaymentOperationsProvider(
  nodeEnv = process.env.NODE_ENV,
  env: NodeJS.ProcessEnv = process.env
): PaymentProvider {
  if (env.PAYMENT_PROVIDER?.trim().toLowerCase() !== "alipay") {
    return new DisabledPaymentProvider("尚未选择受支持的支付渠道。");
  }
  if (nodeEnv === "production" && env.PAYMENT_LIVE_ACK !== "RUNWAYLAB_LIVE_PAYMENT_APPROVED") {
    return new DisabledPaymentProvider("生产支付最终确认未配置。");
  }
  if (nodeEnv === "production" && !env.ALIPAY_SELLER_ID?.trim()) {
    return new DisabledPaymentProvider("生产支付宝收款方标识未配置。");
  }

  const provider = createAlipayPaymentProviderFromEnv(env);
  return provider.configured ? provider : new DisabledPaymentProvider("支付宝商户配置不完整。");
}
