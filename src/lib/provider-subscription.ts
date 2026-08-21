import { FabricStatus, ProviderShowcaseStatus, ProviderSubscriptionPlan, ProviderSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { providerPlanById } from "@/lib/provider-membership";

export const PROVIDER_SUBSCRIPTION_STATUS_LABELS: Record<ProviderSubscriptionStatus, string> = {
  PENDING: "待审核",
  ACTIVE: "已生效",
  EXPIRED: "已到期",
  REJECTED: "已拒绝",
  CANCELLED: "已取消"
};

const PLAN_DAYS: Record<ProviderSubscriptionPlan, number> = {
  FOUNDING_TRIAL: 90,
  GROWTH_MONTHLY: 30,
  GROWTH_QUARTERLY: 90,
  GROWTH_YEARLY: 365
};

export function providerSubscriptionDays(plan: ProviderSubscriptionPlan) {
  return PLAN_DAYS[plan];
}

export function providerSubscriptionPeriod(plan: ProviderSubscriptionPlan, startsAt = new Date()) {
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + providerSubscriptionDays(plan));
  return {
    startsAt,
    endsAt,
    trialEndsAt: plan === ProviderSubscriptionPlan.FOUNDING_TRIAL ? endsAt : null
  };
}

export function providerSubscriptionDisplayStatus(subscription: { status: ProviderSubscriptionStatus; endsAt: Date | null }, now = new Date()) {
  if (subscription.status === ProviderSubscriptionStatus.ACTIVE && subscription.endsAt && subscription.endsAt <= now) return "已到期";
  return PROVIDER_SUBSCRIPTION_STATUS_LABELS[subscription.status];
}

export async function getEffectiveProviderSubscription(providerId: string, now = new Date()) {
  return prisma.providerSubscription.findFirst({
    where: { providerId, status: ProviderSubscriptionStatus.ACTIVE, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }]
  });
}

export async function getProviderCatalogUsage(providerId: string) {
  const [fabricCount, showcaseCount] = await Promise.all([
    prisma.fabric.count({ where: { providerId, status: { not: FabricStatus.ARCHIVED } } }),
    prisma.providerShowcaseItem.count({ where: { providerId, status: { not: ProviderShowcaseStatus.ARCHIVED } } })
  ]);
  return { fabricCount, showcaseCount, total: fabricCount + showcaseCount };
}

export function providerAiExtractionMonthlyLimit() {
  const configured = Number.parseInt(process.env.AI_PRODUCT_EXTRACTION_MONTHLY_LIMIT ?? "100", 10);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 10_000) : 100;
}

export function providerAiUsageMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function consumeProviderAiExtraction(providerId: string, limit: number, now = new Date()) {
  const monthStart = providerAiUsageMonthStart(now);
  const rows = await prisma.$queryRaw<Array<{ requestCount: number }>>`
    INSERT INTO "ProviderAiUsageMonthly" ("providerId", "monthStart", "requestCount", "createdAt", "updatedAt")
    VALUES (${providerId}, ${monthStart}, 1, ${now}, ${now})
    ON CONFLICT ("providerId", "monthStart") DO UPDATE
    SET "requestCount" = "ProviderAiUsageMonthly"."requestCount" + 1,
        "updatedAt" = EXCLUDED."updatedAt"
    WHERE "ProviderAiUsageMonthly"."requestCount" < ${limit}
    RETURNING "requestCount"
  `;
  const requestCount = rows[0]?.requestCount;
  return {
    allowed: typeof requestCount === "number",
    requestCount: requestCount ?? limit,
    remaining: typeof requestCount === "number" ? Math.max(0, limit - requestCount) : 0,
    limit,
    monthStart
  };
}

export async function getProviderEntitlements(providerId: string, now = new Date()) {
  const subscription = await getEffectiveProviderSubscription(providerId, now);
  if (!subscription) {
    return {
      source: "LEGACY_GRACE" as const,
      subscription: null,
      plan: null,
      productLimit: 10,
      aiProductExtractionEnabled: false,
      aiProductExtractionMonthlyLimit: 0,
      label: "历史服务商过渡权益"
    };
  }

  const paid = subscription.plan !== ProviderSubscriptionPlan.FOUNDING_TRIAL;
  return {
    source: "SUBSCRIPTION" as const,
    subscription,
    plan: subscription.plan,
    productLimit: paid ? 50 : 10,
    aiProductExtractionEnabled: paid,
    aiProductExtractionMonthlyLimit: paid ? providerAiExtractionMonthlyLimit() : 0,
    label: providerPlanById(subscription.plan)?.name ?? subscription.plan
  };
}
