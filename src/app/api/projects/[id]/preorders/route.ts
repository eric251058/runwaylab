import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/features";
import { createLimitedPreorder, PreorderError } from "@/lib/projects/preorder-service";
import { PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT } from "@/lib/projects/preorder-buyer-cap";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveQuantity(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT ? number : null;
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) {
    return NextResponse.json({ error: "限量预订功能尚未开放。" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit(`limited-preorder:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return NextResponse.json({ error: "提交太频繁，请稍后再试。" }, { status: 429 });

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: "提交标识无效，请刷新后重试。" }, { status: 400 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = text(body?.productId, 80);
  if (!productId) return NextResponse.json({ error: "请选择预订商品。" }, { status: 400 });
  const quantity = positiveQuantity(body?.quantity);
  if (quantity === null) {
    return NextResponse.json({ error: `首期每个已验证账号每期最多提交 ${PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT} 件订单意向。`, code: "INVALID_QUANTITY" }, { status: 400 });
  }

  try {
    const result = await createLimitedPreorder({
      user,
      projectRef: id,
      productId,
      skuId: text(body?.skuId, 80) || null,
      quantity,
      buyerNote: text(body?.buyerNote, 500) || null,
      idempotencyKey,
      termsAccepted: body?.acceptPreorderTerms === true
    });
    return NextResponse.json({ order: result.order, repeated: result.repeated }, { status: result.repeated ? 200 : 201 });
  } catch (error) {
    if (error instanceof PreorderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("limited preorder creation failed", { errorType: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "预订提交失败，请稍后重试。" }, { status: 500 });
  }
}
