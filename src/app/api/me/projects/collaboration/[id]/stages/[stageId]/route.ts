import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { CommerceStageError, advanceProjectStage, selectStageProposal } from "@/lib/projects/commerce-stages";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SELECT_PROPOSAL"), proposalId: z.string().min(1) }),
  z.object({ action: z.enum(["START", "ACCEPT"]) })
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "阶段操作无效。" }, { status: 422 });
  const { id, stageId } = await params;
  try {
    const item = parsed.data.action === "SELECT_PROPOSAL"
      ? await selectStageProposal(id, parsed.data.proposalId, user.id)
      : await advanceProjectStage(id, stageId, user.id, parsed.data.action);
    return NextResponse.json({ message: "项目阶段已更新。", item });
  } catch (error) {
    if (error instanceof CommerceStageError) return NextResponse.json({ message: error.message }, { status: error.status });
    throw error;
  }
}
