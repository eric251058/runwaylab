import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireFeature } from "@/lib/features";
import { MarketValidationError, openProjectMarketValidation, parseMarketValidationInput } from "@/lib/projects/market-validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireFeature("feature.demand_commerce"))) return NextResponse.json({ message: "需求共创功能尚未开放。" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  try {
    const item = await openProjectMarketValidation((await params).id, user.id, parseMarketValidationInput(await request.json().catch(() => null)));
    return NextResponse.json({ message: "市场验证已开启，当前只收集未付款购买意向。", item }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketValidationError) return NextResponse.json({ message: error.message }, { status: error.status });
    throw error;
  }
}
