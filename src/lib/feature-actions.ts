"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { FEATURE_LABELS, isFeatureKey } from "@/lib/features";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function boolFromForm(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function updateFeatureFlag(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");

  const key = formData.get("key");
  if (!isFeatureKey(key)) throw new Error("功能开关不存在");

  const enabled = boolFromForm(formData.get("enabled"));
  await prisma.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value: enabled ? "true" : "false",
      description: FEATURE_LABELS[key]
    },
    update: {
      value: enabled ? "true" : "false",
      description: FEATURE_LABELS[key]
    }
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "FEATURE_FLAG_UPDATE",
      targetType: "SystemSetting",
      targetId: key,
      detail: {
        key,
        enabled
      }
    }
  });

  revalidatePath("/admin/features");
}
