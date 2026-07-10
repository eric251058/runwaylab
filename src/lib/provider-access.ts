import { ProviderStatus, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getProviderForUser(user: Pick<User, "email"> | null | undefined) {
  if (!user?.email) return null;

  return prisma.provider.findFirst({
    where: {
      contactEmail: user.email,
      status: ProviderStatus.ACTIVE
    }
  });
}
