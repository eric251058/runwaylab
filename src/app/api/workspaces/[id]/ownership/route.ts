import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: "请选择新所有者" }, { status: 400 });

  const [workspace, actor, target] = await Promise.all([
    prisma.workspace.findUnique({ where: { id }, select: { ownerId: true } }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
      select: { id: true, role: true, status: true },
    }),
    prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: id },
      select: { id: true, userId: true, status: true },
    }),
  ]);

  if (!workspace || workspace.ownerId !== user.id || !actor || actor.role !== "OWNER" || actor.status !== "ACTIVE") {
    return NextResponse.json({ error: "只有当前所有者可以转移空间" }, { status: 403 });
  }
  if (!target || target.status !== "ACTIVE" || target.userId === user.id) {
    return NextResponse.json({ error: "新所有者必须是其他活跃成员" }, { status: 400 });
  }

  const transferred = await prisma.$transaction(async (tx) => {
    const claimed = await tx.workspace.updateMany({
      where: { id, ownerId: user.id },
      data: { ownerId: target.userId },
    });
    if (claimed.count !== 1) return false;

    const promoted = await tx.workspaceMember.updateMany({
      where: { id: target.id, workspaceId: id, status: "ACTIVE", role: { not: "OWNER" } },
      data: { role: "OWNER" },
    });
    if (promoted.count !== 1) throw new Error("OWNERSHIP_TARGET_CHANGED");

    await tx.workspaceMember.updateMany({
      where: {
        workspaceId: id,
        status: "ACTIVE",
        role: "OWNER",
        id: { not: target.id },
      },
      data: { role: "ADMIN" },
    });
    return true;
  }).catch((error) => {
    if (error instanceof Error && error.message === "OWNERSHIP_TARGET_CHANGED") return false;
    throw error;
  });
  if (!transferred) {
    return NextResponse.json({ error: "空间所有权已变化，请刷新后重试" }, { status: 409 });
  }
  return NextResponse.json({ ownerId: target.userId });
}
