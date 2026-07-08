import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isUserPersona } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { persona?: unknown } | null;

  if (!isUserPersona(body?.persona)) {
    return NextResponse.json({ error: "身份类型不正确" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      persona: body.persona,
      personaCompleted: true
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      status: true,
      persona: true,
      personaCompleted: true
    }
  });

  return NextResponse.json({ user: updatedUser });
}
