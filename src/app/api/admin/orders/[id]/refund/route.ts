import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/guards";
import { PaymentServiceError, refundOrderPayment } from "@/lib/payments/order-payment-service";
import { createPaymentOperationsProvider } from "@/lib/payments/provider";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const refundSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  reason: z.string().trim().min(4).max(200)
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const limit = checkRateLimit(`online-refund:${admin.id}:30m`, { windowMs: 30 * 60 * 1000, limit: 12 });
  if (limit.limited) return tooManyRequests("退款操作较频繁，请稍后再试。", limit.retryAfter);

  const parsed = refundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "请检查退款金额和原因。" }, { status: 422 });
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  const { id } = await context.params;
  const provider = createPaymentOperationsProvider();

  try {
    const result = await refundOrderPayment({
      orderId: id,
      actorId: admin.id,
      amountCents: parsed.data.amountCents,
      reason: parsed.data.reason,
      idempotencyKey,
      provider
    });
    return NextResponse.json({ message: "退款请求已处理。", ...result });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ message: "退款请求失败，已停止后续状态变更。" }, { status: 500 });
  }
}
