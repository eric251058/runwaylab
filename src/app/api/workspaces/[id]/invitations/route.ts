import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/workspace-permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "当前账号缺少邮箱" }, { status: 400 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; role?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
  }

  const access = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    select: { role: true, status: true },
  });
  if (!canManageWorkspace(access)) {
    return NextResponse.json({ error: "没有邀请成员的权限" }, { status: 403 });
  }
  if (email === user.email.toLowerCase()) {
    return NextResponse.json({ error: "你已经在这个空间中" }, { status: 409 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: id, userId: existingUser.id },
      },
      select: { status: true },
    });
    if (member?.status === "ACTIVE") {
      return NextResponse.json({ error: "该用户已经是空间成员" }, { status: 409 });
    }
  }

  await prisma.workspaceInvitation.updateMany({
    where: { workspaceId: id, email, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId: id,
      email,
      role,
      invitedById: user.id,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
    select: { id: true, token: true, email: true, role: true, expiresAt: true },
  });

  return NextResponse.json(
    { invitation, acceptPath: "/me/workspace-invitations/" + invitation.token },
    { status: 201 }
  );
}
