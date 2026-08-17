"use server";

import { NotificationType, Prisma, UserRole, UserStatus } from "@prisma/client";
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

export async function verifyPilotBuyerContact(formData: FormData) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) redirect("/admin/users?error=forbidden");

  const targetUserId = textValue(formData, "userId");
  const contactType = textValue(formData, "contactType");
  const evidenceRef = textValue(formData, "evidenceRef").slice(0, 200);
  const evidenceSummary = textValue(formData, "evidenceSummary").slice(0, 500);
  if (!targetUserId || !(["email", "phone"] as const).includes(contactType as "email" | "phone")) {
    redirect("/admin/users?error=missing");
  }
  if (evidenceRef.length < 4 || evidenceSummary.length < 10 || formData.get("confirmContactOwnership") !== "on") {
    redirect("/admin/users?error=verification-evidence");
  }

  let outcome: "verified" | "already" = "verified";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      outcome = await prisma.$transaction(async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: targetUserId },
          select: {
            id: true,
            role: true,
            status: true,
            email: true,
            phone: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            updatedAt: true
          }
        });
        if (!target || target.status !== UserStatus.ACTIVE || target.role === UserRole.ADMIN) {
          throw new Error("PILOT_BUYER_NOT_ELIGIBLE");
        }
        const selectedContact = contactType === "email" ? target.email?.trim() : target.phone?.trim();
        if (!selectedContact) throw new Error("PILOT_BUYER_CONTACT_MISSING");
        const alreadyVerified = contactType === "email" ? target.emailVerifiedAt : target.phoneVerifiedAt;
        if (alreadyVerified) return "already" as const;

        const now = new Date();
        const changed = await tx.user.updateMany({
          where: {
            id: target.id,
            status: UserStatus.ACTIVE,
            role: { not: UserRole.ADMIN },
            updatedAt: target.updatedAt,
            ...(contactType === "email" ? { email: target.email } : { phone: target.phone })
          },
          data: contactType === "email" ? { emailVerifiedAt: now } : { phoneVerifiedAt: now }
        });
        if (changed.count !== 1) throw new Error("PILOT_BUYER_CONTACT_CHANGED");

        await tx.adminLog.create({
          data: {
            adminId: admin!.id,
            action: "LIMITED_PREORDER_BUYER_CONTACT_VERIFY",
            targetType: "User",
            targetId: target.id,
            detail: {
              contactType,
              evidenceRef,
              evidenceSummary,
              verifiedAt: now.toISOString()
            }
          }
        });
        await tx.notification.create({
          data: {
            userId: target.id,
            type: NotificationType.REQUEST_HANDLED,
            title: "首期预售联系方式核验完成",
            content: `平台已按人工核验记录确认你的${contactType === "email" ? "邮箱" : "手机号"}。你现在可以提交首期限量预售订单意向；本期仍不在线收款、不收定金。`,
            linkUrl: "/me/profile"
          }
        });
        return "verified" as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      const code = error instanceof Error ? error.message : "";
      if (code === "PILOT_BUYER_NOT_ELIGIBLE") redirect("/admin/users?error=verification-user");
      if (code === "PILOT_BUYER_CONTACT_MISSING") redirect("/admin/users?error=verification-contact");
      if (code === "PILOT_BUYER_CONTACT_CHANGED") redirect("/admin/users?error=verification-conflict");
      throw error;
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/me/profile");
  redirect(`/admin/users?verified=${outcome}`);
}
