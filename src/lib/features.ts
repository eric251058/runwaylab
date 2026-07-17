import { prisma } from "@/lib/prisma";

export const FEATURE_KEYS = [
  "feature.identity_v234",
  "feature.demand_v21",
  "feature.project_marketplace_v22",
  "feature.limited_preorder_v23",
  "feature.live_sms",
  "feature.live_payment",
  "feature.manual_payment_pilot"
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  "feature.identity_v234": "Identity V2.0B.3.4",
  "feature.demand_v21": "Demand V2.1",
  "feature.project_marketplace_v22": "Project Marketplace V2.2",
  "feature.limited_preorder_v23": "Limited Preorder V2.3",
  "feature.live_sms": "真实短信",
  "feature.live_payment": "真实支付",
  "feature.manual_payment_pilot": "人工支付试点"
};

function envName(key: FeatureKey) {
  return key.toUpperCase().replaceAll(".", "_");
}

export function parseFeatureFlagValue(value: string | undefined | null) {
  if (!value) return false;
  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && FEATURE_KEYS.includes(value as FeatureKey);
}

export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [...FEATURE_KEYS]
      }
    },
    select: {
      key: true,
      value: true
    }
  });
  const dbValues = new Map(rows.map((row) => [row.key as FeatureKey, row.value]));

  return Object.fromEntries(
    FEATURE_KEYS.map((key) => {
      const dbValue = dbValues.get(key);
      return [key, dbValue === undefined ? parseFeatureFlagValue(process.env[envName(key)]) : parseFeatureFlagValue(dbValue)];
    })
  ) as Record<FeatureKey, boolean>;
}

export async function isFeatureEnabled(key: FeatureKey) {
  const flags = await getFeatureFlags();
  return flags[key];
}

export async function requireFeature(key: FeatureKey) {
  if (!(await isFeatureEnabled(key))) {
    return false;
  }
  return true;
}
