import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getFeatureFlags } from "@/lib/features";
import { createOrderPayment, PaymentServiceError } from "@/lib/payments/order-payment-service";
import { createPaymentProvider } from "@/lib/payments/provider";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit(`online-payment:${user.id}:15m`, { windowMs: 15 * 60 * 1000, limit: 8 });
  if (limit.limited) return tooManyRequests("支付请求较频繁，请稍后再试。", limit.retryAfter);

  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  const { id } = await context.params;
  const flags = await getFeatureFlags();
  const provider = createPaymentProvider(flags);
  const publicBaseUrl = process.env.PAYMENT_PUBLIC_BASE_URL
    ?? (process.env.NODE_ENV === "production" ? "" : new URL(request.url).origin);

  try {
    const result = await createOrderPayment({
      orderId: id,
      buyerId: user.id,
      idempotencyKey,
      provider,
      publicBaseUrl
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ message: "支付创建失败，请稍后重试。", code: "PAYMENT_CREATE_FAILED" }, { status: 500 });
  }
}
