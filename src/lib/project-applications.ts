import { ProjectApplicationRole, ProjectApplicationStatus } from "@prisma/client";

export const PROJECT_APPLICATION_ROLE_LABELS: Record<ProjectApplicationRole, string> = {
  PROJECT_LEAD: "项目主理与协同",
  FABRIC_PARTNER: "面料合作",
  SAMPLE_PARTNER: "打样合作",
  PRODUCTION_PARTNER: "生产合作",
  BUYER: "买手与采购",
  MARKETING_PARTNER: "市场与内容",
  OTHER: "其他合作"
};

export const PROJECT_APPLICATION_STATUS_LABELS: Record<ProjectApplicationStatus, string> = {
  PENDING: "待审核",
  ACCEPTED: "已接纳",
  REJECTED: "暂未接纳",
  WITHDRAWN: "已撤回"
};

export const PROJECT_APPLICATION_ROLES = Object.values(ProjectApplicationRole);

export function projectOpportunityNeeds(project: {
  ownerUserId?: string | null;
  ownerProviderId?: string | null;
  fabricId?: string | null;
  providerId?: string | null;
  presaleCampaignId?: string | null;
}) {
  const needs: Array<{ key: string; label: string }> = [];
  if (!project.ownerUserId && !project.ownerProviderId) needs.push({ key: "lead", label: "寻找主理人" });
  if (!project.fabricId) needs.push({ key: "fabric", label: "寻找面料伙伴" });
  if (!project.providerId) needs.push({ key: "production", label: "寻找打样/生产伙伴" });
  if (!project.presaleCampaignId) needs.push({ key: "market", label: "寻找买手与市场反馈" });
  return needs;
}
