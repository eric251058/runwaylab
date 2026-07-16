import { revalidatePath } from "next/cache";
import {
  BatchProviderRole,
  BatchProviderStatus,
  BatchWorkStatus,
  IncubationBatchStatus,
  IncubationBatchType,
  ProviderOrderPreference,
  ProviderStatus,
  ProviderType,
  WorkVoteStatus,
  WorkVoteType,
  type IncubationBatchProvider,
  type IncubationBatchWork,
  type Provider,
  type WorkOpportunityProfile
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { calculateOrderMaturity } from "@/lib/order-maturity";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalText } from "@/lib/provider-market";
import { getPublicQualityWorkIds } from "@/lib/works/queries";
import { publicQualityWorkWhere } from "@/lib/works/rules";

export const INCUBATION_BATCH_TYPE_LABELS: Record<IncubationBatchType, string> = {
  SCHOOL_COURSE: "学校课程批次",
  GRADUATION_PROJECT: "毕业设计批次",
  CHALLENGE: "挑战赛批次",
  BRAND_BRIEF: "品牌命题批次",
  BUYER_SELECTION: "买手选品批次",
  FABRIC_CLUSTER: "面料聚合批次",
  PRODUCTION_CLUSTER: "生产聚合批次",
  SMALL_BATCH_PILOT: "小单试产批次",
  OTHER: "其他"
};

export const INCUBATION_BATCH_STATUS_LABELS: Record<IncubationBatchStatus, string> = {
  DRAFT: "草稿",
  RECRUITING: "招募作品中",
  EVALUATING: "评估中",
  MATCHING: "资源匹配中",
  SAMPLING: "打样推进中",
  VALIDATING: "市场验证中",
  PRODUCTION_READY: "可进入生产",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const BATCH_WORK_STATUS_LABELS: Record<BatchWorkStatus, string> = {
  NOMINATED: "已推荐",
  SUBMITTED: "已提交",
  SHORTLISTED: "已候选",
  SELECTED: "已入选",
  SAMPLING: "打样中",
  VALIDATING: "验证中",
  PRODUCTION_READY: "生产准备",
  REMOVED: "已移除"
};

export const BATCH_PROVIDER_ROLE_LABELS: Record<BatchProviderRole, string> = {
  FABRIC_SUPPORT: "面料支持",
  SAMPLE_SUPPORT: "打样支持",
  PRODUCTION_SUPPORT: "生产支持",
  BUYER: "买手",
  SPONSOR: "赞助方",
  MENTOR: "导师",
  OTHER: "其他"
};

export const BATCH_PROVIDER_STATUS_LABELS: Record<BatchProviderStatus, string> = {
  INTERESTED: "感兴趣",
  APPLIED: "已申请",
  SHORTLISTED: "已短选",
  CONFIRMED: "已确认",
  DECLINED: "暂不推进",
  COMPLETED: "已完成"
};

export const selectedBatchWorkStatuses = [
  BatchWorkStatus.SELECTED,
  BatchWorkStatus.SAMPLING,
  BatchWorkStatus.VALIDATING,
  BatchWorkStatus.PRODUCTION_READY
] as const;

export function publicBatchWhere() {
  return {
    adminApproved: true,
    status: {
      notIn: [IncubationBatchStatus.DRAFT, IncubationBatchStatus.CANCELLED]
    }
  };
}

export function workPublicWhere(userId?: string) {
  return userId
    ? {
        ...publicQualityWorkWhere,
        userId,
      }
    : publicQualityWorkWhere;
}

export async function publicQualityBatchWorkWhere() {
  const qualityWorkIds = await getPublicQualityWorkIds();

  return {
    workId: {
      in: qualityWorkIds.length ? qualityWorkIds : ["__no_public_quality_work__"]
    }
  };
}

export async function publicQualityWorkWhereForUser(userId?: string) {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return null;

  return userId
    ? {
        id: {
          in: qualityWorkIds
        },
        userId
      }
    : {
        id: {
          in: qualityWorkIds
        }
      };
}

type BatchStatsInput = {
  targetWorkCount?: number | null;
  targetSampleCount?: number | null;
  targetProductionQuantity?: number | null;
  confirmedProductionQuantity: number;
  estimatedFabricMeters?: { toString(): string } | null;
  works: Array<Pick<IncubationBatchWork, "status"> & {
    work: {
      description: string;
      isEditorPick: boolean;
      favoriteCount: number;
      commentCount: number;
      images: unknown[];
      teacherRecommendations: unknown[];
      fabricRecommendations: unknown[];
      providerWorkProposals: unknown[];
      presaleCampaignIntents: unknown[];
      buyerIntents: unknown[];
      votes: unknown[];
      opportunityProfile: WorkOpportunityProfile | null;
    };
  }>;
  providers: Array<Pick<IncubationBatchProvider, "role" | "status">>;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function calculateBatchStats(batch: BatchStatsInput) {
  const workStatusCounts = Object.fromEntries(Object.values(BatchWorkStatus).map((status) => [status, 0])) as Record<BatchWorkStatus, number>;
  const providerRoleCounts = Object.fromEntries(Object.values(BatchProviderRole).map((role) => [role, 0])) as Record<BatchProviderRole, number>;
  const providerStatusCounts = Object.fromEntries(Object.values(BatchProviderStatus).map((status) => [status, 0])) as Record<BatchProviderStatus, number>;
  const professionalScores: number[] = [];
  const productionScores: number[] = [];
  const marketScores: number[] = [];

  for (const item of batch.works) {
    workStatusCounts[item.status] += 1;
    const maturity = calculateOrderMaturity({
      description: item.work.description,
      imageCount: item.work.images.length,
      isEditorPick: item.work.isEditorPick,
      teacherRecommendationCount: item.work.teacherRecommendations.length,
      fabricRecommendationCount: item.work.fabricRecommendations.length,
      providerProposalCount: item.work.providerWorkProposals.length,
      presaleIntentCount: item.work.presaleCampaignIntents.length,
      buyerInterestCount: item.work.buyerIntents.length,
      wantBuyVoteCount: item.work.votes.length,
      favoriteCount: item.work.favoriteCount,
      commentCount: item.work.commentCount,
      profile: item.work.opportunityProfile
    });
    professionalScores.push(maturity.professionalScore);
    productionScores.push(maturity.productionScore);
    marketScores.push(maturity.marketScore);
  }

  for (const provider of batch.providers) {
    providerRoleCounts[provider.role] += 1;
    providerStatusCounts[provider.status] += 1;
  }

  const selectedWorkCount = selectedBatchWorkStatuses.reduce((sum, status) => sum + workStatusCounts[status], 0);
  const missingItems = [
    batch.targetWorkCount && batch.works.length < batch.targetWorkCount ? "作品数量不足" : null,
    selectedWorkCount === 0 ? "缺少入选作品" : null,
    providerRoleCounts.FABRIC_SUPPORT === 0 ? "缺少面料支持" : null,
    providerRoleCounts.SAMPLE_SUPPORT === 0 ? "缺少打样服务商" : null,
    providerRoleCounts.PRODUCTION_SUPPORT === 0 ? "缺少生产服务商" : null,
    !batch.targetProductionQuantity ? "目标数量不明确" : null,
    batch.confirmedProductionQuantity === 0 ? "确认数量为 0" : null
  ].filter((item): item is string => Boolean(item));

  return {
    workCount: batch.works.length,
    submittedWorkCount: workStatusCounts.SUBMITTED,
    shortlistedWorkCount: workStatusCounts.SHORTLISTED,
    selectedWorkCount,
    samplingWorkCount: workStatusCounts.SAMPLING,
    validatingWorkCount: workStatusCounts.VALIDATING,
    productionReadyWorkCount: workStatusCounts.PRODUCTION_READY,
    providerCount: batch.providers.length,
    confirmedProviderCount: providerStatusCounts.CONFIRMED,
    targetProductionQuantity: batch.targetProductionQuantity ?? 0,
    confirmedProductionQuantity: batch.confirmedProductionQuantity,
    estimatedFabricMeters: batch.estimatedFabricMeters?.toString() ?? null,
    averageProfessionalScore: average(professionalScores),
    averageProductionScore: average(productionScores),
    averageMarketScore: average(marketScores),
    workStatusCounts,
    providerRoleCounts,
    providerStatusCounts,
    missingItems
  };
}

export function providerCanSeeBatch(
  provider: Pick<Provider, "type" | "status" | "opportunityVisible" | "orderPreference" | "acceptsSampling" | "acceptsSmallBatch" | "acceptsLargeOrder" | "minimumOrderQuantity" | "maximumOrderQuantity">,
  batch: {
    type: IncubationBatchType;
    status: IncubationBatchStatus;
    targetSampleCount?: number | null;
    targetProductionQuantity?: number | null;
    confirmedProductionQuantity: number;
    adminApproved: boolean;
  }
) {
  if (provider.status !== ProviderStatus.ACTIVE || !provider.opportunityVisible || !batch.adminApproved) return false;
  if (batch.status === IncubationBatchStatus.DRAFT || batch.status === IncubationBatchStatus.CANCELLED) return false;

  const quantity = batch.targetProductionQuantity ?? batch.confirmedProductionQuantity;
  if (quantity && provider.minimumOrderQuantity && quantity < provider.minimumOrderQuantity) return false;
  if (quantity && provider.maximumOrderQuantity && quantity > provider.maximumOrderQuantity) return false;

  if (provider.type === ProviderType.FABRIC_SUPPLIER) {
    const fabricBatchTypes: IncubationBatchType[] = [
      IncubationBatchType.FABRIC_CLUSTER,
      IncubationBatchType.SCHOOL_COURSE,
      IncubationBatchType.GRADUATION_PROJECT,
      IncubationBatchType.CHALLENGE,
      IncubationBatchType.BRAND_BRIEF
    ];
    return fabricBatchTypes.includes(batch.type);
  }

  if (provider.type === ProviderType.SAMPLE_STUDIO || provider.acceptsSampling || provider.orderPreference === ProviderOrderPreference.SAMPLE_ONLY) {
    const sampleStatuses: IncubationBatchStatus[] = [IncubationBatchStatus.MATCHING, IncubationBatchStatus.SAMPLING];
    return Boolean((batch.targetSampleCount && batch.targetSampleCount > 0) || sampleStatuses.includes(batch.status));
  }

  if (provider.type === ProviderType.FACTORY) {
    if (provider.acceptsLargeOrder || provider.orderPreference === ProviderOrderPreference.LARGE_ORDER) {
      return batch.status === IncubationBatchStatus.PRODUCTION_READY || batch.confirmedProductionQuantity > 0;
    }
    if (provider.acceptsSmallBatch || [ProviderOrderPreference.SMALL_BATCH, ProviderOrderPreference.MEDIUM_ORDER, ProviderOrderPreference.FLEXIBLE].includes(provider.orderPreference)) {
      const smallBatchTypes: IncubationBatchType[] = [IncubationBatchType.SMALL_BATCH_PILOT, IncubationBatchType.BUYER_SELECTION, IncubationBatchType.PRODUCTION_CLUSTER];
      return smallBatchTypes.includes(batch.type);
    }
  }

  if (provider.type === ProviderType.BUYER) {
    const buyerStatuses: IncubationBatchStatus[] = [IncubationBatchStatus.VALIDATING, IncubationBatchStatus.PRODUCTION_READY];
    return batch.type === IncubationBatchType.BUYER_SELECTION || buyerStatuses.includes(batch.status);
  }

  return provider.orderPreference === ProviderOrderPreference.FLEXIBLE;
}

export function providerBatchRecommendationReason(provider: Pick<Provider, "type" | "orderPreference">, batch: { type: IncubationBatchType; status: IncubationBatchStatus; targetProductionQuantity?: number | null; confirmedProductionQuantity: number }) {
  const quantity = batch.targetProductionQuantity ? `目标 ${batch.targetProductionQuantity} 件` : "目标数量待确认";
  if (provider.type === ProviderType.FABRIC_SUPPLIER) return `该批次适合面料支持，${quantity}，可结合面料方向提前筛选。`;
  if (provider.type === ProviderType.SAMPLE_STUDIO) return `该批次处于${INCUBATION_BATCH_STATUS_LABELS[batch.status]}，适合打样工作室参与样衣推进。`;
  if (provider.type === ProviderType.FACTORY) return `该批次${quantity}，确认数量 ${batch.confirmedProductionQuantity} 件，可作为小单或生产机会观察。`;
  if (provider.type === ProviderType.BUYER) return `该批次适合选品验证，可查看入选作品和市场反馈。`;
  return `该批次属于${INCUBATION_BATCH_TYPE_LABELS[batch.type]}，可按自身服务能力判断是否参与。`;
}

function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label}不能为空`);
  return text;
}

function optionalInt(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function optionalDecimal(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T) {
  const text = optionalText(value);
  return text && allowed.includes(text as T) ? (text as T) : fallback;
}

export async function saveIncubationBatch(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");

  const id = optionalText(formData.get("id"));
  const data = {
    slug: requiredText(formData.get("slug"), "批次 slug"),
    title: requiredText(formData.get("title"), "批次标题"),
    summary: requiredText(formData.get("summary"), "一句说明"),
    description: optionalText(formData.get("description")),
    type: enumValue(formData.get("type"), Object.values(IncubationBatchType), IncubationBatchType.OTHER),
    status: enumValue(formData.get("status"), Object.values(IncubationBatchStatus), IncubationBatchStatus.DRAFT),
    organizerName: requiredText(formData.get("organizerName"), "组织方"),
    organizerType: optionalText(formData.get("organizerType")),
    schoolId: optionalText(formData.get("schoolId")),
    challengeId: optionalText(formData.get("challengeId")),
    coverImage: optionalText(formData.get("coverImage")),
    city: optionalText(formData.get("city")),
    startDate: optionalDate(formData.get("startDate")),
    submissionDeadline: optionalDate(formData.get("submissionDeadline")),
    evaluationDeadline: optionalDate(formData.get("evaluationDeadline")),
    targetCompletionDate: optionalDate(formData.get("targetCompletionDate")),
    targetWorkCount: optionalInt(formData.get("targetWorkCount")),
    targetSampleCount: optionalInt(formData.get("targetSampleCount")),
    targetProductionQuantity: optionalInt(formData.get("targetProductionQuantity")),
    confirmedProductionQuantity: optionalInt(formData.get("confirmedProductionQuantity")) ?? 0,
    estimatedFabricMeters: optionalDecimal(formData.get("estimatedFabricMeters")),
    targetCategories: optionalText(formData.get("targetCategories")),
    targetMaterials: optionalText(formData.get("targetMaterials")),
    targetPriceRange: optionalText(formData.get("targetPriceRange")),
    targetMarket: optionalText(formData.get("targetMarket")),
    expectedRepeatOrder: boolValue(formData, "expectedRepeatOrder"),
    adminApproved: boolValue(formData, "adminApproved"),
    featured: boolValue(formData, "featured"),
    publicNote: optionalText(formData.get("publicNote")),
    adminNote: optionalText(formData.get("adminNote"))
  };

  if (id) {
    await prisma.incubationBatch.update({
      where: { id },
      data
    });
  } else {
    await prisma.incubationBatch.create({
      data: {
        ...data,
        createdById: user?.id
      }
    });
  }

  revalidatePath("/batches");
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
}

export async function saveBatchWork(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");

  const batchId = requiredText(formData.get("batchId"), "批次 ID");
  const workId = requiredText(formData.get("workId"), "作品 ID");
  const status = enumValue(formData.get("status"), Object.values(BatchWorkStatus), BatchWorkStatus.NOMINATED);

  await prisma.incubationBatchWork.upsert({
    where: { batchId_workId: { batchId, workId } },
    create: {
      batchId,
      workId,
      status,
      nominationReason: optionalText(formData.get("nominationReason")),
      reviewNote: optionalText(formData.get("reviewNote")),
      sortOrder: optionalInt(formData.get("sortOrder")) ?? 0,
      selectedAt: selectedBatchWorkStatuses.includes(status as (typeof selectedBatchWorkStatuses)[number]) ? new Date() : null
    },
    update: {
      status,
      nominationReason: optionalText(formData.get("nominationReason")),
      reviewNote: optionalText(formData.get("reviewNote")),
      sortOrder: optionalInt(formData.get("sortOrder")) ?? 0,
      selectedAt: selectedBatchWorkStatuses.includes(status as (typeof selectedBatchWorkStatuses)[number]) ? new Date() : null
    }
  });

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/batches");
}

export async function saveBatchProvider(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");

  const batchId = requiredText(formData.get("batchId"), "批次 ID");
  const providerId = requiredText(formData.get("providerId"), "服务商 ID");
  const role = enumValue(formData.get("role"), Object.values(BatchProviderRole), BatchProviderRole.OTHER);

  await prisma.incubationBatchProvider.upsert({
    where: { batchId_providerId_role: { batchId, providerId, role } },
    create: {
      batchId,
      providerId,
      role,
      status: enumValue(formData.get("status"), Object.values(BatchProviderStatus), BatchProviderStatus.INTERESTED),
      note: optionalText(formData.get("note")),
      minimumQuantity: optionalInt(formData.get("minimumQuantity")),
      maximumQuantity: optionalInt(formData.get("maximumQuantity")),
      expectedPriceMin: optionalDecimal(formData.get("expectedPriceMin")),
      expectedPriceMax: optionalDecimal(formData.get("expectedPriceMax")),
      sampleLeadDays: optionalInt(formData.get("sampleLeadDays")),
      productionLeadDays: optionalInt(formData.get("productionLeadDays"))
    },
    update: {
      status: enumValue(formData.get("status"), Object.values(BatchProviderStatus), BatchProviderStatus.INTERESTED),
      note: optionalText(formData.get("note")),
      minimumQuantity: optionalInt(formData.get("minimumQuantity")),
      maximumQuantity: optionalInt(formData.get("maximumQuantity")),
      expectedPriceMin: optionalDecimal(formData.get("expectedPriceMin")),
      expectedPriceMax: optionalDecimal(formData.get("expectedPriceMax")),
      sampleLeadDays: optionalInt(formData.get("sampleLeadDays")),
      productionLeadDays: optionalInt(formData.get("productionLeadDays"))
    }
  });

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/providers/batches");
}

export async function removeBatchWork(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!isAdmin(user)) throw new Error("没有后台权限");

  const id = requiredText(formData.get("id"), "记录 ID");
  const batchId = requiredText(formData.get("batchId"), "批次 ID");
  await prisma.incubationBatchWork.delete({ where: { id } });
  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/batches");
}
