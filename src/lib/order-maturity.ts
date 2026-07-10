import {
  FabricStatus,
  OpportunityStage,
  ProviderCapacityStatus,
  ProviderOpportunityInterestStatus,
  ProviderOpportunityInterestType,
  ProviderOrderPreference,
  ProviderStatus,
  ProviderType,
  SampleStatus,
  type Provider,
  type WorkOpportunityProfile
} from "@prisma/client";

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  DISPLAY_ONLY: "仅展示",
  SAMPLE_READY: "可进入打样",
  SMALL_BATCH_READY: "可进入小单",
  SCALE_READY: "可进入规模生产"
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  NOT_STARTED: "尚未开始",
  PLANNING: "准备中",
  IN_PROGRESS: "打样中",
  COMPLETED: "样衣完成"
};

export const OPPORTUNITY_FABRIC_STATUS_LABELS: Partial<Record<FabricStatus, string>> = {
  UNKNOWN: "尚未明确",
  RECOMMENDED: "已有推荐",
  SELECTED: "已选定",
  CONFIRMED: "已确认"
};

export const PROVIDER_ORDER_PREFERENCE_LABELS: Record<ProviderOrderPreference, string> = {
  SAMPLE_ONLY: "只承接打样",
  SMALL_BATCH: "小单快反",
  MEDIUM_ORDER: "中等订单",
  LARGE_ORDER: "大货订单",
  FLEXIBLE: "灵活承接"
};

export const PROVIDER_CAPACITY_STATUS_LABELS: Record<ProviderCapacityStatus, string> = {
  AVAILABLE: "可承接",
  LIMITED: "产能有限",
  FULL: "暂时满档",
  UNKNOWN: "未填写"
};

export const PROVIDER_INTEREST_TYPE_LABELS: Record<ProviderOpportunityInterestType, string> = {
  INTERESTED: "感兴趣",
  NEED_MORE_INFO: "需要补充资料",
  CAN_SAMPLE: "可以打样",
  CAN_SMALL_BATCH: "可以承接小单",
  CAN_SCALE: "可以承接大货",
  NOT_SUITABLE: "暂不适合"
};

export const PROVIDER_INTEREST_STATUS_LABELS: Record<ProviderOpportunityInterestStatus, string> = {
  SUBMITTED: "已提交",
  REVIEWED: "已查看",
  SHORTLISTED: "已短选",
  DECLINED: "暂不推进",
  CLOSED: "已关闭"
};

export type OrderMaturityInput = {
  description?: string | null;
  imageCount: number;
  isEditorPick?: boolean;
  teacherRecommendationCount: number;
  fabricRecommendationCount: number;
  providerProposalCount: number;
  presaleIntentCount: number;
  buyerInterestCount: number;
  wantBuyVoteCount: number;
  favoriteCount: number;
  commentCount: number;
  profile?: Pick<WorkOpportunityProfile, "stage" | "targetQuantity" | "targetUnitCost" | "targetRetailPrice" | "sampleBudget" | "sampleStatus" | "fabricStatus" | "targetLaunchDate" | "targetDeliveryDate" | "expectedFabricMeters" | "expectedReorder" | "confirmedBuyerQuantity" | "buyerInterestCount" | "adminApproved"> | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function calculateOrderMaturity(input: OrderMaturityInput) {
  const profile = input.profile;
  const hasDescription = Boolean(input.description?.trim() && input.description.trim().length >= 40);
  const hasImages = input.imageCount > 0;
  const hasTeacher = input.teacherRecommendationCount > 0;
  const hasFabric = input.fabricRecommendationCount > 0 || ["RECOMMENDED", "SELECTED", "CONFIRMED"].includes(String(profile?.fabricStatus));
  const fabricSelected = ["SELECTED", "CONFIRMED"].includes(String(profile?.fabricStatus));
  const fabricConfirmed = profile?.fabricStatus === FabricStatus.CONFIRMED;
  const sampleStarted = profile?.sampleStatus === SampleStatus.PLANNING || profile?.sampleStatus === SampleStatus.IN_PROGRESS || profile?.sampleStatus === SampleStatus.COMPLETED;
  const sampleCompleted = profile?.sampleStatus === SampleStatus.COMPLETED;
  const hasQuantity = Boolean(profile?.targetQuantity && profile.targetQuantity > 0);
  const hasCostOrPrice = Boolean(profile?.targetUnitCost || profile?.targetRetailPrice);
  const hasSampleBudget = Boolean(profile?.sampleBudget);
  const hasDelivery = Boolean(profile?.targetLaunchDate || profile?.targetDeliveryDate);
  const buyerQuantity = profile?.confirmedBuyerQuantity ?? 0;
  const buyerInterest = input.buyerInterestCount + (profile?.buyerInterestCount ?? 0);

  const professionalScore = clamp(
    (hasDescription ? 30 : 0) +
    (hasImages ? 25 : 0) +
    (hasTeacher ? 25 : 0) +
    (input.isEditorPick ? 10 : 0) +
    (input.providerProposalCount > 0 ? 10 : 0)
  );
  const productionScore = clamp(
    (hasFabric ? 20 : 0) +
    (fabricSelected ? 15 : 0) +
    (fabricConfirmed ? 10 : 0) +
    (sampleStarted ? 15 : 0) +
    (sampleCompleted ? 15 : 0) +
    (hasQuantity ? 10 : 0) +
    (hasCostOrPrice ? 10 : 0) +
    (hasSampleBudget ? 5 : 0) +
    (hasDelivery ? 5 : 0) +
    (input.providerProposalCount > 0 ? 10 : 0)
  );
  const marketScore = clamp(
    Math.min(input.wantBuyVoteCount * 5, 25) +
    Math.min(input.presaleIntentCount * 5, 25) +
    Math.min(buyerInterest * 15, 30) +
    Math.min(buyerQuantity > 0 ? 25 : 0, 25) +
    Math.min(input.favoriteCount, 10) +
    Math.min(input.commentCount * 2, 10)
  );

  let recommendedStage: OpportunityStage = OpportunityStage.DISPLAY_ONLY;
  if (hasDescription && hasImages && (hasTeacher || input.isEditorPick) && hasFabric && (hasSampleBudget || sampleStarted)) {
    recommendedStage = OpportunityStage.SAMPLE_READY;
  }
  if (sampleStarted && fabricSelected && hasQuantity && hasCostOrPrice && (input.presaleIntentCount > 0 || buyerInterest > 0 || input.wantBuyVoteCount >= 3)) {
    recommendedStage = OpportunityStage.SMALL_BATCH_READY;
  }
  if (sampleCompleted && fabricConfirmed && hasQuantity && hasDelivery && buyerQuantity > 0) {
    recommendedStage = OpportunityStage.SCALE_READY;
  }

  const missingItems = [
    hasDescription ? null : "补充完整作品说明",
    hasImages ? null : "补充作品图片",
    hasTeacher ? null : "增加老师或专业推荐",
    hasFabric ? null : "明确面料方向",
    hasSampleBudget ? null : "填写打样预算",
    hasQuantity ? null : "填写目标数量",
    hasCostOrPrice ? null : "补充目标成本或零售价",
    hasDelivery ? null : "补充目标时间"
  ].filter((item): item is string => Boolean(item));
  const strengths = [
    hasDescription && hasImages ? "作品资料较完整" : null,
    hasTeacher ? "已有老师推荐" : null,
    hasFabric ? "已有面料方向" : null,
    sampleCompleted ? "样衣已完成" : sampleStarted ? "样衣正在推进" : null,
    input.presaleIntentCount || input.wantBuyVoteCount ? "已有市场兴趣" : null,
    buyerInterest || buyerQuantity ? "已有买手或采购兴趣" : null
  ].filter((item): item is string => Boolean(item));

  return {
    professionalScore,
    productionScore,
    marketScore,
    recommendedStage,
    missingItems,
    strengths
  };
}

export function stageRank(stage: OpportunityStage) {
  return [OpportunityStage.DISPLAY_ONLY, OpportunityStage.SAMPLE_READY, OpportunityStage.SMALL_BATCH_READY, OpportunityStage.SCALE_READY].indexOf(stage);
}

export function providerCanSeeStage(provider: Pick<Provider, "type" | "orderPreference" | "acceptsSampling" | "acceptsSmallBatch" | "acceptsLargeOrder" | "minimumOrderQuantity" | "maximumOrderQuantity" | "status" | "opportunityVisible">, profile: Pick<WorkOpportunityProfile, "stage" | "targetQuantity" | "adminApproved">) {
  if (provider.status !== ProviderStatus.ACTIVE || !provider.opportunityVisible || !profile.adminApproved || profile.stage === OpportunityStage.DISPLAY_ONLY) {
    return false;
  }

  const quantity = profile.targetQuantity;
  const canSample = provider.type === ProviderType.SAMPLE_STUDIO || provider.acceptsSampling || provider.orderPreference === ProviderOrderPreference.SAMPLE_ONLY || provider.orderPreference === ProviderOrderPreference.FLEXIBLE;
  const canSmallBatch = provider.acceptsSmallBatch || provider.orderPreference === ProviderOrderPreference.SMALL_BATCH || provider.orderPreference === ProviderOrderPreference.MEDIUM_ORDER || provider.orderPreference === ProviderOrderPreference.FLEXIBLE;
  const canScale = provider.acceptsLargeOrder || provider.orderPreference === ProviderOrderPreference.LARGE_ORDER || provider.orderPreference === ProviderOrderPreference.FLEXIBLE;

  if (!quantity && profile.stage !== OpportunityStage.SAMPLE_READY) return false;
  if (quantity && provider.minimumOrderQuantity && quantity < provider.minimumOrderQuantity) return false;
  if (quantity && provider.maximumOrderQuantity && quantity > provider.maximumOrderQuantity) return false;
  if (profile.stage === OpportunityStage.SAMPLE_READY) return canSample;
  if (profile.stage === OpportunityStage.SMALL_BATCH_READY) return canSmallBatch || canScale;
  if (profile.stage === OpportunityStage.SCALE_READY) return canScale;

  return false;
}

export function providerRecommendationReason(provider: Pick<Provider, "orderPreference" | "acceptsSampling" | "acceptsSmallBatch" | "acceptsLargeOrder">, profile: Pick<WorkOpportunityProfile, "stage" | "targetQuantity" | "sampleStatus" | "fabricStatus">) {
  const quantity = profile.targetQuantity ? `预计 ${profile.targetQuantity} 件` : "暂未填写目标数量";
  if (profile.stage === OpportunityStage.SAMPLE_READY) return `你可承接打样，该项目${quantity}，适合先推进样衣。`;
  if (profile.stage === OpportunityStage.SMALL_BATCH_READY) return `你承接小单快反，该项目${quantity}，样衣和面料条件正在成熟。`;
  if (profile.stage === OpportunityStage.SCALE_READY) return `你可承接大货，该项目${quantity}，已进入更高订单成熟度。`;
  return "该项目仍在展示阶段。";
}
