import {
  Prisma,
  ProjectCommerceStage,
  ProjectStageProposalStatus,
  ProjectStageStatus,
  ProviderType,
  UserPersona,
  type User
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getProviderForUser } from "@/lib/provider-access";

const proposalSchema = z.object({
  stageId: z.string().trim().min(1),
  summary: z.string().trim().min(20, "请至少用 20 个字符说明方案。").max(1200),
  directionUrl: z.string().url("方案链接格式不正确。").max(500).optional().nullable(),
  price: z.number().int().min(0).max(100_000_000).optional().nullable(),
  leadTimeDays: z.number().int().min(1).max(730).optional().nullable(),
  deliverables: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  commercialNote: z.string().trim().max(500).optional().nullable()
}).strict();

const requiredProviderType: Partial<Record<ProjectCommerceStage, ProviderType>> = {
  FABRIC: ProviderType.FABRIC_SUPPLIER,
  SAMPLE: ProviderType.SAMPLE_STUDIO,
  PRODUCTION: ProviderType.FACTORY
};

const nextStage: Partial<Record<ProjectCommerceStage, ProjectCommerceStage>> = {
  DESIGN: ProjectCommerceStage.FABRIC,
  FABRIC: ProjectCommerceStage.SAMPLE,
  SAMPLE: ProjectCommerceStage.PRODUCTION
};

export class CommerceStageError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export async function submitStageProposal(projectId: string, user: User, raw: unknown) {
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) throw new CommerceStageError(parsed.error.issues[0]?.message ?? "方案内容有误。", 422);
  const stage = await prisma.projectStage.findFirst({
    where: { id: parsed.data.stageId, projectId },
    include: { project: { select: { ownerUserId: true, visibility: true, provider: { select: { ownerId: true } } } } }
  });
  if (!stage) throw new CommerceStageError("项目阶段不存在。", 404);
  if (stage.project.ownerUserId === user.id) throw new CommerceStageError("需求发起人不能为自己的项目提交方案。", 403);
  if (stage.project.visibility !== "PUBLIC" && stage.project.provider?.ownerId !== user.id) {
    throw new CommerceStageError("该项目未公开征集方案。", 403);
  }
  if (stage.status !== ProjectStageStatus.OPEN && stage.status !== ProjectStageStatus.SELECTION_PENDING) {
    throw new CommerceStageError("该阶段当前不接受方案。");
  }

  let providerId: string | null = null;
  const providerType = requiredProviderType[stage.stage];
  if (providerType) {
    const provider = await getProviderForUser(user);
    if (!provider || provider.type !== providerType) {
      throw new CommerceStageError("当前阶段只接受对应类型的已入驻服务商。", 403);
    }
    providerId = provider.id;
  } else if (user.persona !== UserPersona.DESIGNER && user.role !== "STUDENT_DESIGNER" && user.role !== "NEW_DESIGNER") {
    throw new CommerceStageError("设计阶段只接受设计师提交方案。", 403);
  }

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.projectStageProposal.upsert({
      where: { stageId_applicantId: { stageId: stage.id, applicantId: user.id } },
      create: { projectId, applicantId: user.id, providerId, ...parsed.data, stageId: stage.id },
      update: { providerId, summary: parsed.data.summary, directionUrl: parsed.data.directionUrl, price: parsed.data.price,
        leadTimeDays: parsed.data.leadTimeDays, deliverables: parsed.data.deliverables,
        commercialNote: parsed.data.commercialNote, status: ProjectStageProposalStatus.SUBMITTED,
        shortlistedAt: null, selectedAt: null, rejectedAt: null, withdrawnAt: null }
    });
    await tx.projectStage.updateMany({ where: { id: stage.id, status: ProjectStageStatus.OPEN }, data: { status: ProjectStageStatus.SELECTION_PENDING } });
    return proposal;
  });
}

export async function selectStageProposal(projectId: string, proposalId: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.projectStageProposal.findFirst({
      where: { id: proposalId, projectId },
      include: { stage: true, project: { select: { ownerUserId: true } } }
    });
    if (!proposal) throw new CommerceStageError("方案不存在。", 404);
    if (proposal.project.ownerUserId !== ownerId) throw new CommerceStageError("只有需求发起人可以选择方案。", 403);
    if (proposal.stage.status !== ProjectStageStatus.OPEN && proposal.stage.status !== ProjectStageStatus.SELECTION_PENDING) {
      throw new CommerceStageError("该阶段已经完成选择。");
    }
    await tx.projectStageProposal.updateMany({
      where: { stageId: proposal.stageId, id: { not: proposal.id }, status: { in: ["SUBMITTED", "SHORTLISTED"] } },
      data: { status: ProjectStageProposalStatus.REJECTED, rejectedAt: new Date() }
    });
    await tx.projectStageProposal.update({ where: { id: proposal.id }, data: { status: ProjectStageProposalStatus.SELECTED, selectedAt: new Date() } });
    await tx.projectStage.update({ where: { id: proposal.stageId }, data: { status: ProjectStageStatus.SELECTED, selectedProposalId: proposal.id, selectedAt: new Date() } });
    return proposal;
  });
}

export async function advanceProjectStage(projectId: string, stageId: string, ownerId: string, action: "START" | "ACCEPT") {
  return prisma.$transaction(async (tx) => {
    const stage = await tx.projectStage.findFirst({ where: { id: stageId, projectId }, include: { project: true } });
    if (!stage) throw new CommerceStageError("项目阶段不存在。", 404);
    if (stage.project.ownerUserId !== ownerId) throw new CommerceStageError("只有需求发起人可以推进阶段。", 403);
    if (action === "START") {
      if (stage.status !== ProjectStageStatus.SELECTED) throw new CommerceStageError("请先选择合作方案。");
      return tx.projectStage.update({ where: { id: stage.id }, data: { status: ProjectStageStatus.IN_PROGRESS, startedAt: new Date() } });
    }
    if (stage.status !== ProjectStageStatus.IN_PROGRESS && stage.status !== ProjectStageStatus.ACCEPTANCE) throw new CommerceStageError("当前阶段还不能验收。");
    await tx.projectStage.update({ where: { id: stage.id }, data: { status: ProjectStageStatus.COMPLETED, completedAt: new Date(), acceptanceAt: new Date() } });
    const upcoming = nextStage[stage.stage];
    if (upcoming) {
      await tx.projectStage.update({ where: { projectId_stage: { projectId, stage: upcoming } }, data: { status: ProjectStageStatus.OPEN, opensAt: new Date() } });
      await tx.collaborationProject.update({ where: { id: projectId }, data: { currentCommerceStage: upcoming } });
    }
    return { completed: stage.stage, next: upcoming ?? null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
