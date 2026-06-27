import { UserRole, UserStatus, type User } from "@prisma/client";

export function isAdmin(user: Pick<User, "role" | "status"> | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

export function canEditWork(
  user: Pick<User, "id" | "role" | "status"> | null | undefined,
  work: { userId: string; reviewStatus: string }
) {
  if (!user || user.status !== UserStatus.ACTIVE) {
    return false;
  }

  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return user.id === work.userId && ["PENDING", "REJECTED"].includes(work.reviewStatus);
}

export function canViewWorkDetail(
  user: Pick<User, "id" | "role" | "status"> | null | undefined,
  work: { userId: string; reviewStatus: string; contentStatus: string }
) {
  if (work.reviewStatus === "APPROVED" && work.contentStatus === "VISIBLE") {
    return true;
  }

  if (!user || user.status !== UserStatus.ACTIVE) {
    return false;
  }

  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return user.id === work.userId && ["PENDING", "REJECTED"].includes(work.reviewStatus);
}
