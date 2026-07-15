"use server";

import { UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, deleteUserSessions } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateUserStatus(formData: FormData) {
  const admin = await getCurrentUser();

  if (!isAdmin(admin)) {
    redirect("/admin/users?error=forbidden");
  }

  const targetUserId = textValue(formData, "userId");
  const nextStatus = textValue(formData, "status") === UserStatus.BANNED ? UserStatus.BANNED : UserStatus.ACTIVE;

  if (!targetUserId) {
    redirect("/admin/users?error=missing");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, status: true }
  });

  if (!targetUser) {
    redirect("/admin/users?error=not-found");
  }

  if (targetUser.id === admin!.id && nextStatus === UserStatus.BANNED) {
    redirect("/admin/users?error=self");
  }

  if (targetUser.role === UserRole.ADMIN && targetUser.status === UserStatus.ACTIVE && nextStatus === UserStatus.BANNED) {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      }
    });

    if (activeAdminCount <= 1) {
      redirect("/admin/users?error=last-admin");
    }
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { status: nextStatus }
  });

  if (nextStatus === UserStatus.BANNED) {
    await deleteUserSessions(targetUser.id);
  }

  await prisma.adminLog.create({
    data: {
      adminId: admin!.id,
      action: nextStatus === UserStatus.BANNED ? "BAN_USER" : "RESTORE_USER",
      targetType: "USER",
      targetId: targetUser.id,
      detail: {
        status: nextStatus
      }
    }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
