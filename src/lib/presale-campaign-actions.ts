"use server";

import { revalidatePath } from "next/cache";
import {
  PresaleCampaignIntentStatus,
  PresaleCampaignStatus,
  ProjectDesignAuthorizationStatus,
  UserRole,
  UserStatus,
  type Prisma
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationForMany, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalDate, optionalText, positiveInt, requiredText, splitOptions } from "@/lib/presale-campaign";
import { isPublicQualityWork } from "@/lib/works/rules";

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

async function assertWorkCanEnterPublicPresale(workId: string) {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      title: true,
      description: true,
      reviewStatus: true,
      contentStatus: true,
      visibility: true,
      images: {
        select: { imageUrl: true }
      }
    }
  });

  if (!work || !isPublicQualityWork(work)) {
    throw new Error("该作品尚未达到公开质量门槛，请先补齐图片、标题和作品说明并完成审核；当前只能保存为草稿。");
  }
}

async function assertDesignerAuthorizedPublicPresale(workId: string) {
  const authorizedProject = await prisma.collaborationProject.findFirst({
    where: {
      workId,
      designerAuthorizationStatus: ProjectDesignAuthorizationStatus.ACCEPTED
    },
    select: { id: true }
  });

  if (!authorizedProject) {
    throw new Error("作品作者尚未通过合作项目确认设计授权；管理员和项目主理人不能代签，当前只能保存为草稿。");
  }
}

type PresaleLaunchData = {
  title: string;
  description: string | null;
  targetCount: number;
  estimatedPrice: string | null;
  sizeOptions: string[];
  colorOptions: string[];
  startDate: Date | null;
  endDate: Date | null;
};

function assertCampaignCanLaunch(data: PresaleLaunchData) {
  const missing: string[] = [];

  if (data.title.trim().length < 6) missing.push("清晰的预售标题");
  if (!data.description || data.description.trim().length < 20) missing.push("至少 20 字的预售说明");
  if (!data.estimatedPrice) missing.push("预计价格");
  if (!data.sizeOptions.length) missing.push("可选尺码");
  if (!data.colorOptions.length) missing.push("可选颜色");
  if (!data.startDate) missing.push("开始日期");
  if (!data.endDate) missing.push("结束日期");
  if (data.targetCount < 1) missing.push("有效的目标数量");

  if (missing.length) {
    throw new Error(`预售资料尚未完整：${missing.join("、")}。请先保存为草稿，补齐后再设为验证中。`);
  }

  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw new Error("预售结束日期必须晚于开始日期；当前只能保存为草稿。");
  }
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

    const admins = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      },
      select: { id: true }
    });
    await createNotificationForMany(
      admins.map((admin) => ({
        recipientId: admin.id,
        actorId: user?.id,
        eventType: NOTIFICATION_EVENTS.PRESALE_INTENT_RECEIVED,
        title: "收到新的预售意向",
        body: `有用户对预售活动提交了 ${quantity} 件购买意向，请及时跟进。`,
        targetUrl: "/admin/presale-intents",
        allowSelfNotification: true,
        dedupe: false
      }))
    );
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

  if (data.status === PresaleCampaignStatus.ACTIVE) {
    await assertWorkCanEnterPublicPresale(data.workId);
    await assertDesignerAuthorizedPublicPresale(data.workId);
    assertCampaignCanLaunch(data);
  }

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
