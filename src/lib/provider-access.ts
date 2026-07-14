import { ProviderStatus, UserRole, UserStatus, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProviderAccessUser = Pick<User, "id" | "email" | "role" | "status"> | null | undefined;

function userProviderWhere(user: Pick<User, "id" | "email">) {
  return {
    OR: [{ ownerId: user.id }, { contactEmail: user.email }]
  };
}

export async function getProviderForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.provider.findFirst({
    where: {
      ...userProviderWhere(user),
      status: ProviderStatus.ACTIVE
    },
    orderBy: [{ ownerId: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getAnyProviderForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  if (user.role === UserRole.ADMIN) {
    return prisma.provider.findFirst({
      orderBy: [{ updatedAt: "desc" }]
    });
  }

  return prisma.provider.findFirst({
    where: userProviderWhere(user),
    orderBy: [{ ownerId: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getProviderApplicationForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.providerApplication.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }]
    },
    orderBy: [{ createdAt: "desc" }]
  });
}
