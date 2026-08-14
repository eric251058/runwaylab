import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; memberId: string }> };

async function loadAccess(workspaceId: string, userId: string, memberId: string) {
  const [actor, target] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true, status: true },
    }),
    prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      select: { id: true, userId: true, role: true, status: true },
    }),
  ]);
  return { actor, target };
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id, memberId } = await context.params;
  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "ADMIN" && role !== "MEMBER") return NextResponse.json({ error: "成员角色无效" }, { status: 400 });

  const { actor, target } = await loadAccess(id, user.id, memberId);
  if (!actor || actor.status !== "ACTIVE" || actor.role !== "OWNER") {
    return NextResponse.json({ error: "只有空间所有者可以调整角色" }, { status: 403 });
  }
  if (!target || target.status !== "ACTIVE") return NextResponse.json({ error: "成员不存在或已离开" }, { status: 404 });
  if (target.role === "OWNER" || target.userId === user.id) {
    return NextResponse.json({ error: "不能通过此操作修改所有者角色" }, { status: 409 });
  }

  const member = await prisma.workspaceMember.update({
    where: { id: target.id },
    data: { role },
    select: { id: true, role: true, status: true },
  });
  return NextResponse.json({ member });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id, memberId } = await context.params;
  const { actor, target } = await loadAccess(id, user.id, memberId);
  if (!actor || actor.status !== "ACTIVE" || (actor.role !== "OWNER" && actor.role !== "ADMIN")) {
    return NextResponse.json({ error: "你没有移除成员的权限" }, { status: 403 });
  }
  if (!target || target.status !== "ACTIVE") return NextResponse.json({ error: "成员不存在或已离开" }, { status: 404 });
  if (target.userId === user.id) return NextResponse.json({ error: "请使用退出空间功能" }, { status: 409 });
  if (target.role === "OWNER") return NextResponse.json({ error: "不能移除空间所有者" }, { status: 409 });
  if (actor.role === "ADMIN" && target.role !== "MEMBER") {
    return NextResponse.json({ error: "管理员只能移除普通成员" }, { status: 403 });
  }

  await prisma.workspaceMember.update({ where: { id: target.id }, data: { status: "REMOVED" } });
  return NextResponse.json({ status: "REMOVED" });
}
