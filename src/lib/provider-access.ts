import { ProviderStatus, UserStatus, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProviderAccessUser = Pick<User, "id" | "role" | "status"> | null | undefined;

export async function getProviderForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.provider.findFirst({
    where: {
      ownerId: user.id,
      status: ProviderStatus.ACTIVE
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getAnyProviderForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.provider.findFirst({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getProviderApplicationForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.providerApplication.findFirst({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }]
  });
}
