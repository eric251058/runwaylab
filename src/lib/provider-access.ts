import { Prisma, ProviderStatus, UserStatus, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ProviderAccessUser = Pick<User, "id" | "email" | "role" | "status"> | null | undefined;

function userProviderWhere(user: Pick<User, "id" | "email">) {
  const conditions: Prisma.ProviderWhereInput[] = [{ ownerId: user.id }];
  if (user.email) {
    // Legacy fallback for providers created before ownerId binding. This is an exact normalized email match, not a role permission.
    conditions.push({ contactEmail: { equals: user.email.trim().toLowerCase(), mode: Prisma.QueryMode.insensitive } });
  }

  return {
    OR: conditions
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

  return prisma.provider.findFirst({
    where: userProviderWhere(user),
    orderBy: [{ ownerId: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getProviderApplicationForUser(user: ProviderAccessUser) {
  if (!user?.id || user.status !== UserStatus.ACTIVE) return null;

  return prisma.providerApplication.findFirst({
    where: {
      OR: user.email ? [{ userId: user.id }, { email: user.email }] : [{ userId: user.id }]
    },
    orderBy: [{ createdAt: "desc" }]
  });
}
