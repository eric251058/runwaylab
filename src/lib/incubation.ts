import { ProposalStatus, WorkIncubationStatus } from "@prisma/client";

export const incubationStatusLabels: Record<WorkIncubationStatus, string> = {
  DISPLAYING: "展示中",
  CANDIDATE: "孵化候选",
  FABRIC_MATCHING: "寻找面料中",
  SAMPLE_MATCHING: "寻找打样中",
  PRODUCTION_MATCHING: "寻找生产中",
  PRESALE_TESTING: "预售意向中",
  COLLABORATION_REACHED: "已达成合作"
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  PENDING: "待处理",
  INTERESTED: "感兴趣",
  ACCEPTED: "已采纳",
  REJECTED: "暂不合适",
  INVALID: "违规/无效"
};

export const designerProposalStatuses: ProposalStatus[] = [
  ProposalStatus.INTERESTED,
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED
] as ProposalStatus[];

export const adminProposalStatuses: ProposalStatus[] = [
  ProposalStatus.PENDING,
  ProposalStatus.INTERESTED,
  ProposalStatus.ACCEPTED,
  ProposalStatus.REJECTED,
  ProposalStatus.INVALID
] as ProposalStatus[];

export const workIncubationStatuses: WorkIncubationStatus[] = [
  WorkIncubationStatus.DISPLAYING,
  WorkIncubationStatus.CANDIDATE,
  WorkIncubationStatus.FABRIC_MATCHING,
  WorkIncubationStatus.SAMPLE_MATCHING,
  WorkIncubationStatus.PRODUCTION_MATCHING,
  WorkIncubationStatus.PRESALE_TESTING,
  WorkIncubationStatus.COLLABORATION_REACHED
] as WorkIncubationStatus[];

export type IncubationSignals = {
  likeCount: number;
  favoriteCount: number;
  presaleIntentCount: number;
  buyerIntentCount: number;
};

export function canEnterIncubationCandidate(signals: IncubationSignals) {
  return (
    signals.likeCount >= 30 ||
    signals.favoriteCount >= 10 ||
    signals.presaleIntentCount >= 20 ||
    signals.buyerIntentCount >= 3
  );
}

export function getIncubationRuleText(signals: IncubationSignals) {
  if (canEnterIncubationCandidate(signals)) {
    return "已满足孵化候选建议条件，可由后台或设计师继续推进。";
  }

  return "达到点赞 30、收藏 10、预售意向 20 或采购意向 3 任一条件后，建议进入孵化候选。";
}

export function statusPillClass(status: ProposalStatus) {
  if (status === ProposalStatus.ACCEPTED) return "bg-ink text-white";
  if (status === ProposalStatus.INTERESTED) return "bg-amber-100 text-amber-800";
  if (status === ProposalStatus.REJECTED) return "bg-zinc-100 text-ink/55";
  if (status === ProposalStatus.INVALID) return "bg-red-100 text-red-700";
  return "bg-white text-ink/60";
}

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
