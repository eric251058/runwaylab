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
  price: z.number().int().min(0).max(100_000_000),
  leadTimeDays: z.number().int().min(1).max(730),
  deliverables: z.array(z.string().trim().min(1).max(100)).min(1, "请至少填写一项交付内容。").max(20),
  commercialNote: z.string().trim().min(10, "请说明费用范围、授权或合作边界。").max(500),
  revisionRounds: z.number().int().min(0).max(10),
  acceptanceCriteria: z.array(z.string().trim().min(2).max(120)).min(1, "请至少填写一项客观验收标准。").max(20)
}).strict();

const commitmentEvidenceSchema = z.object({
  reference: z.string().trim().min(4, "请填写有效凭证编号。").max(120),
  note: z.string().trim().max(500).optional().nullable()
}).strict();

export const MAX_ACTIVE_STAGE_PROPOSALS = 5;

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

const CommitmentStatus = {
  NOT_REQUIRED: "NOT_REQUIRED",
  REQUIRED: "REQUIRED",
  EVIDENCE_PENDING: "EVIDENCE_PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED"
} as const;

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
  const commitmentStatus = (stage as typeof stage & { commitmentStatus: string }).commitmentStatus;
  if (stage.stage === ProjectCommerceStage.DESIGN && commitmentStatus !== CommitmentStatus.VERIFIED && commitmentStatus !== CommitmentStatus.NOT_REQUIRED) {
    throw new CommerceStageError("需求方尚未完成项目启动金认证，暂不接受设计方案。", 409);
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.projectStageProposal.findUnique({ where: { stageId_applicantId: { stageId: stage.id, applicantId: user.id } }, select: { id: true } });
        if (!existing) {
          const activeCount = await tx.projectStageProposal.count({ where: { stageId: stage.id, status: { in: ["SUBMITTED", "SHORTLISTED"] } } });
          if (activeCount >= MAX_ACTIVE_STAGE_PROPOSALS) throw new CommerceStageError("本阶段已收到 5 个有效方案，暂不再增加候选人。", 409);
        }
        const proposal = await (tx.projectStageProposal as any).upsert({
          where: { stageId_applicantId: { stageId: stage.id, applicantId: user.id } },
          create: { projectId, applicantId: user.id, providerId, ...parsed.data, stageId: stage.id },
          update: { providerId, summary: parsed.data.summary, directionUrl: parsed.data.directionUrl, price: parsed.data.price,
            leadTimeDays: parsed.data.leadTimeDays, deliverables: parsed.data.deliverables,
            commercialNote: parsed.data.commercialNote, revisionRounds: parsed.data.revisionRounds,
            acceptanceCriteria: parsed.data.acceptanceCriteria, status: ProjectStageProposalStatus.SUBMITTED,
            shortlistedAt: null, selectedAt: null, rejectedAt: null, withdrawnAt: null }
        });
        await tx.projectStage.updateMany({ where: { id: stage.id, status: ProjectStageStatus.OPEN }, data: { status: ProjectStageStatus.SELECTION_PENDING } });
        return proposal;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new CommerceStageError("方案提交冲突，请重试。", 409);
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
    const selectedStage = proposal.stage as typeof proposal.stage & { commitmentStatus: string; commitmentAmount: number | null };
    const certifiedAmount = selectedStage.stage === ProjectCommerceStage.DESIGN && selectedStage.commitmentStatus === CommitmentStatus.VERIFIED
      ? selectedStage.commitmentAmount ?? 0
      : 0;
    const remainingCommitment = Math.max(0, (proposal.price ?? 0) - certifiedAmount);
    await tx.projectStage.update({ where: { id: proposal.stageId }, data: {
      status: ProjectStageStatus.SELECTED, selectedProposalId: proposal.id, selectedAt: new Date(),
      ...(remainingCommitment > 0 ? {
        commitmentStatus: CommitmentStatus.REQUIRED,
        commitmentAmount: remainingCommitment,
        commitmentReference: null,
        commitmentNote: certifiedAmount > 0 ? `已认证的项目启动金 ¥${(certifiedAmount / 100).toFixed(2)} 将抵扣本阶段费用。` : null,
        commitmentSubmittedAt: null,
        commitmentVerifiedAt: null,
        commitmentVerifiedById: null
      } : {})
    } });
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
      const commitmentStatus = (stage as typeof stage & { commitmentStatus: string }).commitmentStatus;
      if (commitmentStatus === CommitmentStatus.REQUIRED || commitmentStatus === CommitmentStatus.EVIDENCE_PENDING || commitmentStatus === CommitmentStatus.REJECTED) {
        throw new CommerceStageError("项目启动金或阶段启动款尚未核验，不能开始正式工作。", 409);
      }
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

export async function submitStageCommitmentEvidence(projectId: string, stageId: string, ownerId: string, raw: unknown) {
  const parsed = commitmentEvidenceSchema.safeParse(raw);
  if (!parsed.success) throw new CommerceStageError(parsed.error.issues[0]?.message ?? "凭证内容有误。", 422);
  const stage = await prisma.projectStage.findFirst({ where: { id: stageId, projectId }, include: { project: { select: { ownerUserId: true } } } });
  if (!stage) throw new CommerceStageError("项目阶段不存在。", 404);
  if (stage.project.ownerUserId !== ownerId) throw new CommerceStageError("只有需求发起人可以提交付款凭证。", 403);
  const commitmentStatus = (stage as typeof stage & { commitmentStatus: string }).commitmentStatus;
  if (commitmentStatus === CommitmentStatus.NOT_REQUIRED) throw new CommerceStageError("当前阶段不需要提交启动款。", 409);
  if (commitmentStatus === CommitmentStatus.VERIFIED) throw new CommerceStageError("当前启动款已经核验。", 409);
  return (prisma.projectStage as any).update({ where: { id: stage.id }, data: {
    commitmentStatus: CommitmentStatus.EVIDENCE_PENDING,
    commitmentReference: parsed.data.reference,
    commitmentNote: parsed.data.note,
    commitmentSubmittedAt: new Date(),
    commitmentVerifiedAt: null,
    commitmentVerifiedById: null
  } });
}

export async function reviewStageCommitment(projectId: string, stageId: string, reviewer: User, approved: boolean, note?: string | null) {
  if (reviewer.role !== "ADMIN") throw new CommerceStageError("当前过渡期仅管理员可以核验线下付款凭证。", 403);
  const stage = await prisma.projectStage.findFirst({ where: { id: stageId, projectId } });
  if (!stage) throw new CommerceStageError("项目阶段不存在。", 404);
  const commitmentStage = stage as typeof stage & { commitmentStatus: string; commitmentNote: string | null };
  if (commitmentStage.commitmentStatus !== CommitmentStatus.EVIDENCE_PENDING) throw new CommerceStageError("当前没有待核验凭证。", 409);
  return (prisma.projectStage as any).update({ where: { id: stage.id }, data: approved ? {
    commitmentStatus: CommitmentStatus.VERIFIED,
    commitmentVerifiedAt: new Date(),
    commitmentVerifiedById: reviewer.id,
    commitmentNote: note?.trim() || commitmentStage.commitmentNote
  } : {
    commitmentStatus: CommitmentStatus.REJECTED,
    commitmentVerifiedAt: null,
    commitmentVerifiedById: reviewer.id,
    commitmentNote: note?.trim() || "凭证未通过核验，请重新提交。"
  } });
}
