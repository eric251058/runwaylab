import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireFeature } from "@/lib/features";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { CommerceStageError, submitStageProposal } from "@/lib/projects/commerce-stages";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireFeature("feature.demand_commerce"))) return NextResponse.json({ message: "需求共创功能尚未开放。" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const limit = checkRateLimit(`stage-proposal:${user.id}:1h`, { windowMs: 3_600_000, limit: 10 });
  if (limit.limited) return NextResponse.json({ message: "提交太频繁，请稍后再试。" }, { status: 429 });
  try {
    const item = await submitStageProposal((await params).id, user, await request.json().catch(() => null));
    return NextResponse.json({ message: "方案已提交。", item }, { status: 201 });
  } catch (error) {
    if (error instanceof CommerceStageError) return NextResponse.json({ message: error.message }, { status: error.status });
    throw error;
  }
}
