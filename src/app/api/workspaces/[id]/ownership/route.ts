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

  await prisma.$transaction([
    prisma.workspace.update({ where: { id }, data: { ownerId: target.userId } }),
    prisma.workspaceMember.update({ where: { id: actor.id }, data: { role: "ADMIN" } }),
    prisma.workspaceMember.update({ where: { id: target.id }, data: { role: "OWNER" } }),
  ]);
  return NextResponse.json({ ownerId: target.userId });
}
