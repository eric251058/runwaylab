import type { FeatureKey } from "@/lib/features";

export type PaymentRequest = {
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
};

export type PaymentResult =
  | { ok: true; provider: string; paymentUrl?: string | null; message: string }
  | { ok: false; provider: string; reason: string };

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
}

export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = "disabled";

  async createPayment(_input: PaymentRequest): Promise<PaymentResult> {
    return {
      ok: false,
      provider: this.name,
      reason: "当前仅记录预订意向，未开启真实支付。"
    };
  }
}

export function createPaymentProvider(flags: Partial<Record<FeatureKey, boolean>>, nodeEnv = process.env.NODE_ENV): PaymentProvider {
  if (!flags["feature.live_payment"]) return new DisabledPaymentProvider();
  if (nodeEnv === "production" && !flags["feature.manual_payment_pilot"]) return new DisabledPaymentProvider();
  return new DisabledPaymentProvider();
}
