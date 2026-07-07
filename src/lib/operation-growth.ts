import { WorkIncubationStatus } from "@prisma/client";
import { incubationStatusLabels } from "@/lib/incubation";

export type HeatSignals = {
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  presaleIntentCount?: number;
  fabricProposalCount?: number;
  sampleProposalCount?: number;
  factoryProposalCount?: number;
  buyerIntentCount?: number;
};

export function getHeatScore(signals: HeatSignals) {
  return (
    signals.likeCount * 1 +
    signals.favoriteCount * 2 +
    signals.commentCount * 3 +
    (signals.presaleIntentCount ?? 0) * 5 +
    (signals.fabricProposalCount ?? 0) * 4 +
    (signals.sampleProposalCount ?? 0) * 6 +
    (signals.factoryProposalCount ?? 0) * 7 +
    (signals.buyerIntentCount ?? 0) * 8
  );
}

export function getHeatBadges(signals: HeatSignals) {
  const badges: string[] = [];
  const heatScore = getHeatScore(signals);
  const industryCount = (signals.fabricProposalCount ?? 0) + (signals.sampleProposalCount ?? 0) + (signals.factoryProposalCount ?? 0);

  if (heatScore >= 60) badges.push("热度增长中");
  if ((signals.presaleIntentCount ?? 0) >= 5) badges.push("预售意向活跃");
  if ((signals.buyerIntentCount ?? 0) >= 2) badges.push("采购关注中");
  if (industryCount >= 3) badges.push("产业合作活跃");

  return badges;
}

export const incubationProgressStages = [
  WorkIncubationStatus.DISPLAYING,
  WorkIncubationStatus.CANDIDATE,
  WorkIncubationStatus.FABRIC_MATCHING,
  WorkIncubationStatus.SAMPLE_MATCHING,
  WorkIncubationStatus.PRODUCTION_MATCHING,
  WorkIncubationStatus.PRESALE_TESTING,
  WorkIncubationStatus.COLLABORATION_REACHED
] as const;

export function getProgressIndex(status: WorkIncubationStatus) {
  return Math.max(0, incubationProgressStages.indexOf(status));
}

export function getProgressLabel(status: WorkIncubationStatus) {
  return incubationStatusLabels[status];
}
