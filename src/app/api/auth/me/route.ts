import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { accountDisplayName, maskEmail, maskPhone } from "@/lib/account-display";
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
        ...(user.email ? [{ contactEmail: { equals: user.email.trim().toLowerCase(), mode: "insensitive" as const } }] : [])
      ]
    },
    select: { id: true, name: true }
  });
  const displayName = accountDisplayName({
    providerName: provider?.name,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    preferProvider: Boolean(provider)
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      displayName,
      providerName: provider?.name ?? null,
      maskedAccount: maskEmail(user.email) ?? maskPhone(user.phone),
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      persona: user.persona,
      personaCompleted: user.personaCompleted,
      hasProvider: Boolean(provider)
    }
  });
}
