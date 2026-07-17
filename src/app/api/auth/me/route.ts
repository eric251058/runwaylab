import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { ownerId: user.id },
        ...(user.email ? [{ contactEmail: user.email }] : [])
      ]
    },
    select: { id: true }
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      persona: user.persona,
      personaCompleted: user.personaCompleted,
      hasProvider: Boolean(provider)
    }
  });
}
