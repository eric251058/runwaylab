import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    select: { id: true, role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ error: "你不是该空间的活跃成员" }, { status: 404 });
  }
  if (membership.role === "OWNER") {
    return NextResponse.json(
      { error: "所有者退出前需要先转移空间所有权" },
      { status: 409 }
    );
  }

  await prisma.workspaceMember.update({
    where: { id: membership.id },
    data: { status: "LEFT" },
  });

  return NextResponse.json({ status: "LEFT" });
}
