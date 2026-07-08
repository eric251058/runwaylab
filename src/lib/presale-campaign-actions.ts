"use server";

import { revalidatePath } from "next/cache";
import { PresaleCampaignIntentStatus, PresaleCampaignStatus, type Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalDate, optionalText, positiveInt, requiredText, splitOptions } from "@/lib/presale-campaign";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  return user;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  const text = optionalText(value);
  return text && allowed.includes(text as T) ? (text as T) : fallback;
}

export async function submitPresaleCampaignIntent(formData: FormData) {
  const campaignId = requiredText(formData.get("campaignId"), "预售活动");
  const workId = requiredText(formData.get("workId"), "作品");
  const quantity = Math.min(999, positiveInt(formData.get("quantity"), 1));
  const user = await getCurrentUser();

  const campaign = await prisma.presaleCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      workId: true,
      status: true
    }
  });

  if (!campaign || campaign.workId !== workId || campaign.status !== PresaleCampaignStatus.ACTIVE) {
    return { ok: false, message: "该预售验证暂不可提交。" };
  }

  const phone = optionalText(formData.get("phone"));
  const email = optionalText(formData.get("email"));
  const wechat = optionalText(formData.get("wechat"));
  if (!phone && !email && !wechat) {
    return { ok: false, message: "请至少填写微信、手机或邮箱中的一个联系方式。" };
  }

  const guestConditions: Prisma.PresaleCampaignIntentWhereInput[] = [];
  if (phone) guestConditions.push({ phone });
  if (email) guestConditions.push({ email });
  if (wechat) guestConditions.push({ wechat });
  const duplicateWhere = user
    ? { campaignId, userId: user.id }
    : guestConditions.length
      ? {
          campaignId,
          OR: guestConditions
        }
      : null;

  if (duplicateWhere) {
    const duplicate = await prisma.presaleCampaignIntent.findFirst({
      where: duplicateWhere,
      select: { id: true }
    });
    if (duplicate) {
      return { ok: false, message: "你已经提交过该预售意向，平台后续会联系你确认细节。" };
    }
  }

  try {
    await prisma.$transaction([
      prisma.presaleCampaignIntent.create({
        data: {
          campaignId,
          workId,
          userId: user?.id,
          name: optionalText(formData.get("name")),
          phone,
          email,
          wechat,
          size: optionalText(formData.get("size")),
          color: optionalText(formData.get("color")),
          quantity,
          note: optionalText(formData.get("note")),
          source: optionalText(formData.get("source")) ?? "WORK_DETAIL"
        }
      }),
      prisma.presaleCampaign.update({
        where: { id: campaignId },
        data: {
          currentCount: {
            increment: quantity
          }
        }
      })
    ]);
  } catch (error) {
    console.error("Failed to submit presale campaign intent", error);
    return { ok: false, message: "提交失败，请稍后再试。" };
  }

  revalidatePath(`/works/${workId}`);
  revalidatePath("/presale");
  revalidatePath("/me/incubation");
  revalidatePath("/admin/presale-campaigns");
  revalidatePath("/admin/presale-intents");
  return { ok: true, message: "已收到你的预售意向。当前不会收款，平台会在作品进入打样或预售阶段后联系你确认。" };
}

export async function savePresaleCampaign(formData: FormData) {
  const admin = await requireAdminUser();
  const id = optionalText(formData.get("id"));
  const data = {
    workId: requiredText(formData.get("workId"), "作品"),
    title: requiredText(formData.get("title"), "预售标题"),
    slug: optionalText(formData.get("slug")),
    description: optionalText(formData.get("description")),
    targetCount: positiveInt(formData.get("targetCount"), 50),
    estimatedPrice: optionalText(formData.get("estimatedPrice")),
    priceNote: optionalText(formData.get("priceNote")),
    sizeOptions: splitOptions(formData.get("sizeOptions")),
    colorOptions: splitOptions(formData.get("colorOptions")),
    startDate: optionalDate(formData.get("startDate")),
    endDate: optionalDate(formData.get("endDate")),
    status: enumValue(formData.get("status"), Object.values(PresaleCampaignStatus), PresaleCampaignStatus.DRAFT),
    isFeatured: boolValue(formData, "isFeatured")
  };

  if (id) {
    await prisma.presaleCampaign.update({ where: { id }, data });
  } else {
    await prisma.presaleCampaign.create({
      data: {
        ...data,
        createdById: admin.id
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/presale");
  revalidatePath("/works");
  revalidatePath("/me/incubation");
  revalidatePath("/admin/presale-campaigns");
}

export async function updatePresaleCampaignIntentStatus(formData: FormData) {
  await requireAdminUser();
  const id = requiredText(formData.get("id"), "意向 ID");
  const status = enumValue(formData.get("status"), Object.values(PresaleCampaignIntentStatus), PresaleCampaignIntentStatus.SUBMITTED);

  await prisma.presaleCampaignIntent.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/admin/presale-intents");
  revalidatePath("/me/incubation");
}
