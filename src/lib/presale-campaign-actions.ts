"use server";

import { revalidatePath } from "next/cache";
import {
  PresaleCampaignIntentStatus,
  PresaleCampaignStatus,
  LimitedPreorderStatus,
  ProjectDesignAuthorizationStatus,
  Prisma,
  UserRole,
  UserStatus
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationForMany, createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalDate, optionalText, positiveInt, requiredText, splitOptions } from "@/lib/presale-campaign";
import { assertLimitedPreorderOfferEditable } from "@/lib/projects/preorder-offer";
import { isPublicQualityWork } from "@/lib/works/rules";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("没有后台权限");
  return user;
}

async function runPresaleCampaignSaveTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("活动资料并发冲突，请刷新后重试");
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  const text = optionalText(value);
  return text && allowed.includes(text as T) ? (text as T) : fallback;
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
      title: true,
      workId: true,
      status: true,
      work: { select: { userId: true } }
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
    await createNotificationSafe({
      recipientId: campaign.work.userId,
      actorId: user?.id,
      eventType: NOTIFICATION_EVENTS.PRESALE_INTENT_RECEIVED,
      title: "作品收到新的预售意向",
      body: `“${campaign.title}”新增 ${quantity} 件购买意向。这是市场意向，不是订单或已付款交易。`,
      targetUrl: "/me/incubation",
      dedupe: false
    });
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
  const collaborationProjectId = optionalText(formData.get("collaborationProjectId"));
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
    if (!collaborationProjectId) throw new Error("公开需求验证必须关联一个已取得设计授权的协作项目。");
    assertCampaignCanLaunch(data);
  }

  await runPresaleCampaignSaveTransaction(async (tx) => {
    if (id) {
      const offerAuthorization = await tx.projectDesignAuthorization.findFirst({
        where: {
          preorderCampaignId: id,
          status: { in: [ProjectDesignAuthorizationStatus.PENDING, ProjectDesignAuthorizationStatus.ACCEPTED] }
        },
        select: { status: true }
      });
      assertLimitedPreorderOfferEditable(offerAuthorization?.status);
    }
    if (collaborationProjectId) {
      const selectedProject = await tx.collaborationProject.findUnique({
        where: { id: collaborationProjectId },
        select: {
          workId: true,
          presaleCampaignId: true,
          designerAuthorizationStatus: true,
          work: {
            select: {
              userId: true,
              title: true,
              description: true,
              reviewStatus: true,
              contentStatus: true,
              visibility: true,
              images: { select: { imageUrl: true } }
            }
          },
          designAuthorizations: {
            select: { status: true, workId: true, designerUserId: true },
            take: 1
          }
        }
      });
      if (!selectedProject || selectedProject.workId !== data.workId) throw new Error("协作项目与预售作品不一致");
      const authorization = selectedProject.designAuthorizations[0];
      if (
        selectedProject.designerAuthorizationStatus !== ProjectDesignAuthorizationStatus.ACCEPTED
        || authorization?.status !== ProjectDesignAuthorizationStatus.ACCEPTED
        || authorization.workId !== data.workId
        || authorization.designerUserId !== selectedProject.work?.userId
      ) {
        throw new Error("协作项目尚未取得与当前作品及作者一致的真实设计授权");
      }
      if (data.status === PresaleCampaignStatus.ACTIVE && (!selectedProject.work || !isPublicQualityWork(selectedProject.work))) {
        throw new Error("该作品尚未达到公开质量门槛，请先补齐图片、标题和作品说明并完成审核；当前只能保存为草稿。");
      }
      if (selectedProject.presaleCampaignId && selectedProject.presaleCampaignId !== id) throw new Error("协作项目已关联其他预售活动");
    }

    let campaign;
    if (id) {
      const changed = await tx.presaleCampaign.updateMany({
        where: {
          id,
          preorderStatus: LimitedPreorderStatus.NOT_STARTED,
          designAuthorizations: {
            none: { status: { in: [ProjectDesignAuthorizationStatus.PENDING, ProjectDesignAuthorizationStatus.ACCEPTED] } }
          }
        },
        data
      });
      if (changed.count !== 1) {
        const existing = await tx.presaleCampaign.findUnique({ where: { id }, select: { preorderStatus: true } });
        if (!existing) throw new Error("预售活动不存在");
        throw new Error("限量预售开始后活动资料与项目关联已锁定，请到生命周期工作台操作。");
      }
      campaign = await tx.presaleCampaign.findUniqueOrThrow({ where: { id } });
    } else {
      campaign = await tx.presaleCampaign.create({ data: { ...data, createdById: admin.id } });
    }

    await tx.collaborationProject.updateMany({
      where: {
        presaleCampaignId: campaign.id,
        ...(collaborationProjectId ? { id: { not: collaborationProjectId } } : {})
      },
      data: { presaleCampaignId: null }
    });
    if (collaborationProjectId) {
      const linked = await tx.collaborationProject.updateMany({
        where: { id: collaborationProjectId, OR: [{ presaleCampaignId: null }, { presaleCampaignId: campaign.id }] },
        data: { presaleCampaignId: campaign.id }
      });
      if (linked.count !== 1) throw new Error("协作项目关联状态已变化，请刷新后重试");
    }
  });

  revalidatePath("/");
  revalidatePath("/presale");
  revalidatePath("/works");
  revalidatePath("/me/incubation");
  revalidatePath("/admin/presale-campaigns");
}

export async function updatePresaleCampaignIntentStatus(formData: FormData) {
  const admin = await requireAdminUser();
  const id = requiredText(formData.get("id"), "意向 ID");
  const status = enumValue(formData.get("status"), Object.values(PresaleCampaignIntentStatus), PresaleCampaignIntentStatus.SUBMITTED);
  const intent = await prisma.presaleCampaignIntent.findUnique({
    where: { id },
    select: {
      id: true,
      campaignId: true,
      workId: true,
      userId: true,
      quantity: true,
      status: true,
      campaign: { select: { title: true } }
    }
  });
  if (!intent) throw new Error("预售意向不存在");
  if (intent.status === status) return;

  const wasCounted = intent.status !== PresaleCampaignIntentStatus.CANCELLED;
  const willBeCounted = status !== PresaleCampaignIntentStatus.CANCELLED;

  await prisma.$transaction(async (tx) => {
    const changed = await tx.presaleCampaignIntent.updateMany({
      where: { id: intent.id, status: intent.status },
      data: { status }
    });
    if (changed.count !== 1) throw new Error("预售意向状态已变化，请刷新后重试");

    if (wasCounted !== willBeCounted) {
      await tx.presaleCampaign.update({
        where: { id: intent.campaignId },
        data: {
          currentCount: willBeCounted
            ? { increment: intent.quantity }
            : { decrement: intent.quantity }
        }
      });
    }
  });

  if (intent.userId) {
    const statusCopy: Record<PresaleCampaignIntentStatus, { title: string; body: string }> = {
      SUBMITTED: {
        title: "预售意向已恢复",
        body: `你对“${intent.campaign.title}”的预售意向已恢复为待跟进状态。`
      },
      CONTACTED: {
        title: "预售意向正在跟进",
        body: `平台已开始跟进你对“${intent.campaign.title}”提交的预售意向。`
      },
      CONFIRMED: {
        title: "预售意向已确认",
        body: `你对“${intent.campaign.title}”的预售意向已确认，后续如进入打样或正式销售阶段，平台会继续通知你。`
      },
      CANCELLED: {
        title: "预售意向已取消",
        body: `你对“${intent.campaign.title}”的预售意向已取消，不再计入当前需求数量。`
      }
    };
    const copy = statusCopy[status];
    await createNotificationSafe({
      recipientId: intent.userId,
      actorId: admin.id,
      eventType: NOTIFICATION_EVENTS.PRESALE_INTENT_UPDATED,
      title: copy.title,
      body: copy.body,
      targetUrl: "/me/presale",
      dedupe: false
    });
  }

  revalidatePath("/presale");
  revalidatePath("/notifications");
  revalidatePath("/me/presale");

  revalidatePath("/admin/presale-campaigns");
  revalidatePath("/admin/presale-intents");
  revalidatePath("/me/incubation");
}

export async function cancelOwnPresaleCampaignIntent(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");
  const id = requiredText(formData.get("id"), "意向 ID");
  const intent = await prisma.presaleCampaignIntent.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      campaignId: true,
      workId: true,
      quantity: true,
      status: true,
      campaign: { select: { title: true } },
      work: { select: { userId: true } }
    }
  });
  if (!intent) throw new Error("预售意向不存在");
  if (intent.status === PresaleCampaignIntentStatus.CANCELLED) return;
  if (intent.status === PresaleCampaignIntentStatus.CONFIRMED) {
    throw new Error("已确认的预售意向不能直接撤回，请联系平台处理");
  }

  await prisma.$transaction(async (tx) => {
    const changed = await tx.presaleCampaignIntent.updateMany({
      where: {
        id: intent.id,
        userId: user.id,
        status: { in: [PresaleCampaignIntentStatus.SUBMITTED, PresaleCampaignIntentStatus.CONTACTED] }
      },
      data: { status: PresaleCampaignIntentStatus.CANCELLED }
    });
    if (changed.count !== 1) throw new Error("预售意向状态已变化，请刷新后重试");
    const campaignChanged = await tx.presaleCampaign.updateMany({
      where: { id: intent.campaignId, currentCount: { gte: intent.quantity } },
      data: { currentCount: { decrement: intent.quantity } }
    });
    if (campaignChanged.count !== 1) throw new Error("预售数量状态异常，请联系平台处理");
  });

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    select: { id: true }
  });
  await createNotificationForMany(
    admins.map((admin) => ({
      recipientId: admin.id,
      actorId: user.id,
      eventType: NOTIFICATION_EVENTS.PRESALE_INTENT_UPDATED,
      title: "用户撤回预售意向",
      body: `用户已撤回对“${intent.campaign.title}”的 ${intent.quantity} 件预售意向，需求数量已同步扣减。`,
      targetUrl: "/admin/presale-intents",
      allowSelfNotification: true,
      dedupe: false
    }))
  );

  await createNotificationSafe({
    recipientId: intent.work.userId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PRESALE_INTENT_UPDATED,
    title: "作品预售意向已撤回",
    body: `“${intent.campaign.title}”减少 ${intent.quantity} 件购买意向，需求数量已同步更新。这是市场意向变化，不是退款或订单取消。`,
    targetUrl: "/me/incubation",
    dedupe: false
  });

  revalidatePath(`/works/${intent.workId}`);
  revalidatePath("/presale");
  revalidatePath("/notifications");
  revalidatePath("/me/presale");
  revalidatePath("/admin/presale-campaigns");
  revalidatePath("/admin/presale-intents");
  revalidatePath("/me/incubation");
}
