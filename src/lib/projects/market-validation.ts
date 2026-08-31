import {
  CollaborationProjectVisibility,
  PresaleCampaignStatus,
  ProjectCommerceStage,
  ProjectDemandMode,
  ProjectDesignAuthorizationStatus,
  ProjectStageStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class MarketValidationError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export type MarketValidationInput = {
  title: string;
  description: string;
  targetCount: number;
  estimatedPrice: string;
  sizeOptions: string[];
  colorOptions: string[];
  startDate: Date;
  endDate: Date;
};

export function parseMarketValidationInput(value: unknown): MarketValidationInput {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const list = (key: string) => text(key).split(/[,，\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
  const targetCount = Number(body.targetCount);
  const startDate = new Date(text("startDate"));
  const endDate = new Date(text("endDate"));
  const input = {
    title: text("title"), description: text("description"), targetCount,
    estimatedPrice: text("estimatedPrice"), sizeOptions: list("sizeOptions"), colorOptions: list("colorOptions"),
    startDate, endDate
  };
  if (input.title.length < 6) throw new MarketValidationError("标题至少需要 6 个字。", 422);
  if (input.description.length < 20) throw new MarketValidationError("市场验证说明至少需要 20 个字。", 422);
  if (!Number.isInteger(targetCount) || targetCount < 5 || targetCount > 10000) throw new MarketValidationError("目标数量必须在 5–10000 之间。", 422);
  if (!input.estimatedPrice) throw new MarketValidationError("请填写预计价格区间。", 422);
  if (!input.sizeOptions.length || !input.colorOptions.length) throw new MarketValidationError("请至少填写一个尺码和一个颜色。", 422);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) throw new MarketValidationError("市场验证起止日期无效。", 422);
  return input;
}

export async function openProjectMarketValidation(projectId: string, actorId: string, input: MarketValidationInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.collaborationProject.findUnique({
      where: { id: projectId },
      select: {
        id: true, title: true, workId: true, ownerUserId: true, createdById: true, visibility: true,
        demandMode: true, presaleCampaignId: true,
        projectIntake: { select: { ownerId: true } },
        designAuthorizations: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
        commerceStages: { where: { stage: ProjectCommerceStage.SAMPLE }, select: { status: true }, take: 1 }
      }
    });
    if (!project) throw new MarketValidationError("项目不存在。", 404);
    if (![project.ownerUserId, project.createdById, project.projectIntake?.ownerId].includes(actorId)) throw new MarketValidationError("只有项目发起人可以开启市场验证。", 403);
    if (project.demandMode !== ProjectDemandMode.PUBLIC_COCREATION || project.visibility !== CollaborationProjectVisibility.PUBLIC) throw new MarketValidationError("只有公开共创项目可以开启市场验证。", 409);
    if (!project.workId) throw new MarketValidationError("项目尚未形成可公开展示的设计作品。", 409);
    if (project.presaleCampaignId) throw new MarketValidationError("该项目已经关联市场验证活动。", 409);
    if (project.designAuthorizations[0]?.status !== ProjectDesignAuthorizationStatus.ACCEPTED) throw new MarketValidationError("设计师尚未确认公开验证与后续商业授权。", 409);
    if (project.commerceStages[0]?.status !== ProjectStageStatus.COMPLETED) throw new MarketValidationError("样衣阶段完成并验收后才能开启市场验证。", 409);

    const campaign = await tx.presaleCampaign.create({
      data: {
        workId: project.workId, createdById: actorId, title: input.title, description: input.description,
        targetCount: input.targetCount, estimatedPrice: input.estimatedPrice,
        sizeOptions: input.sizeOptions, colorOptions: input.colorOptions,
        startDate: input.startDate, endDate: input.endDate, status: PresaleCampaignStatus.ACTIVE
      }
    });
    await tx.collaborationProject.update({
      where: { id: project.id, presaleCampaignId: null },
      data: { presaleCampaignId: campaign.id, status: "PRESALE_VALIDATING" }
    });
    return campaign;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
