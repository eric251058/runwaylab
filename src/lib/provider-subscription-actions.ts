"use server";

import { ProviderStatus, ProviderSubscriptionPlan, ProviderSubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getAnyProviderForUser } from "@/lib/provider-access";
import { providerPlanById } from "@/lib/provider-membership";
import { prisma } from "@/lib/prisma";
import { providerSubscriptionPeriod } from "@/lib/provider-subscription";

const planValues = new Set(Object.values(ProviderSubscriptionPlan));

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function requestProviderSubscription(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/provider-center/membership");
  const provider = await getAnyProviderForUser(user);
  if (!provider || provider.status !== ProviderStatus.ACTIVE) throw new Error("只有已审核服务商可以申请套餐");

  const rawPlan = value(formData, "plan");
  if (!planValues.has(rawPlan as ProviderSubscriptionPlan)) throw new Error("套餐无效");
  const plan = rawPlan as ProviderSubscriptionPlan;
  const catalogPlan = providerPlanById(plan);
  if (!catalogPlan) throw new Error("套餐不存在");
  const selfActivated = plan === ProviderSubscriptionPlan.FOUNDING_TRIAL;

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.providerSubscription.updateMany({
      where: { providerId: provider.id, status: ProviderSubscriptionStatus.ACTIVE, endsAt: { lte: now } },
      data: { status: ProviderSubscriptionStatus.EXPIRED }
    });
    const blocking = await tx.providerSubscription.findFirst({
      where: {
        providerId: provider.id,
        OR: [
          { status: ProviderSubscriptionStatus.PENDING },
          { status: ProviderSubscriptionStatus.ACTIVE }
        ]
      }
    });
    if (blocking) throw new Error("已有待审核或生效中的套餐，请勿重复申请");

    if (plan === ProviderSubscriptionPlan.FOUNDING_TRIAL) {
      const previousTrial = await tx.providerSubscription.findFirst({
        where: { providerId: provider.id, plan, status: { not: ProviderSubscriptionStatus.REJECTED } }
      });
      if (previousTrial) throw new Error("首批试运营权益每个服务商只能申请一次");
    }

    await tx.providerSubscription.create({
      data: {
        providerId: provider.id,
        requestedById: user.id,
        plan,
        priceCny: catalogPlan.priceCny,
        ...(selfActivated
          ? {
              status: ProviderSubscriptionStatus.ACTIVE,
              reviewedAt: now,
              reviewNote: "服务商自助开通首批试运营权益",
              ...providerSubscriptionPeriod(plan, now)
            }
          : {})
      }
    });
  });

  revalidatePath("/provider-center");
  revalidatePath("/provider-center/membership");
  revalidatePath("/admin/provider-subscriptions");
  redirect(selfActivated ? "/provider-center/membership?activated=1" : "/provider-center/membership?requested=1");
}

export async function reviewProviderSubscription(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || !isAdmin(admin)) throw new Error("需要管理员权限");
  const subscriptionId = value(formData, "subscriptionId");
  const action = value(formData, "action");
  const reviewNote = value(formData, "reviewNote");
  if (!subscriptionId || !["ACTIVATE", "REJECT", "CANCEL"].includes(action)) throw new Error("审核参数无效");
  if (reviewNote.length < 4) throw new Error("启用、拒绝或取消套餐都必须填写至少 4 个字的审核说明");

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.providerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { provider: { select: { status: true } } }
    });
    if (!subscription) throw new Error("套餐申请不存在");
    const now = new Date();
    await tx.providerSubscription.updateMany({
      where: { providerId: subscription.providerId, id: { not: subscription.id }, status: ProviderSubscriptionStatus.ACTIVE, endsAt: { lte: now } },
      data: { status: ProviderSubscriptionStatus.EXPIRED }
    });

    if (action === "ACTIVATE") {
      if (subscription.status !== ProviderSubscriptionStatus.PENDING) throw new Error("只有待审核申请可以启用");
      if (subscription.provider.status !== ProviderStatus.ACTIVE) throw new Error("服务商当前不是正常运营状态，不能启用套餐");
      await tx.providerSubscription.updateMany({
        where: { providerId: subscription.providerId, id: { not: subscription.id }, status: ProviderSubscriptionStatus.ACTIVE },
        data: { status: ProviderSubscriptionStatus.CANCELLED, reviewedById: admin.id, reviewedAt: now, reviewNote: "新套餐生效，旧套餐已结束" }
      });
      await tx.providerSubscription.update({
        where: { id: subscription.id },
        data: { status: ProviderSubscriptionStatus.ACTIVE, reviewedById: admin.id, reviewedAt: now, reviewNote, ...providerSubscriptionPeriod(subscription.plan, now) }
      });
    } else {
      const nextStatus = action === "REJECT" ? ProviderSubscriptionStatus.REJECTED : ProviderSubscriptionStatus.CANCELLED;
      if (action === "REJECT" && subscription.status !== ProviderSubscriptionStatus.PENDING) throw new Error("只有待审核申请可以拒绝");
      if (action === "CANCEL" && subscription.status !== ProviderSubscriptionStatus.ACTIVE) throw new Error("只有生效套餐可以取消");
      await tx.providerSubscription.update({
        where: { id: subscription.id },
        data: { status: nextStatus, reviewedById: admin.id, reviewedAt: now, reviewNote, endsAt: action === "CANCEL" ? now : subscription.endsAt }
      });
    }

    await tx.adminLog.create({
      data: {
        adminId: admin.id,
        action: `PROVIDER_SUBSCRIPTION_${action}`,
        targetType: "ProviderSubscription",
        targetId: subscription.id,
        detail: { providerId: subscription.providerId, plan: subscription.plan, previousStatus: subscription.status, reviewNote }
      }
    });
  });

  revalidatePath("/admin/provider-subscriptions");
  revalidatePath("/provider-center");
  revalidatePath("/provider-center/membership");
}
