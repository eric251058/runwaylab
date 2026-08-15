import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "当前账号缺少邮箱" }, { status: 400 });
  }
  const { token } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { action?: unknown }
    | null;
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  }

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "邀请不存在或已处理" }, { status: 404 });
  }
  if (invitation.email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "该邀请不属于当前账号" }, { status: 403 });
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "邀请已过期" }, { status: 410 });
  }

  if (action === "decline") {
    const declined = await prisma.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "DECLINED" },
    });
    if (declined.count !== 1) {
      return NextResponse.json({ error: "邀请已被其他操作处理" }, { status: 409 });
    }
    return NextResponse.json({ status: "DECLINED" });
  }

  const accepted = await prisma.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: "ACCEPTED" },
    });
    if (claimed.count !== 1) return false;

    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
        status: "ACTIVE",
      },
      update: { role: invitation.role, status: "ACTIVE" },
    });
    return true;
  });
  if (!accepted) {
    return NextResponse.json({ error: "邀请已被其他操作处理或已经过期" }, { status: 409 });
  }

  return NextResponse.json({
    status: "ACCEPTED",
    workspaceId: invitation.workspaceId,
  });
}
