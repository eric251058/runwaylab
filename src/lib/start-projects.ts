import { ProjectIntakeStatus, UserRole, UserStatus, type Prisma, type ProjectIntake, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  START_CATEGORY_VALUES,
  START_NEED_VALUES,
  START_SOURCE_VALUES,
  projectIntakeCreateSchema,
  projectIntakePatchSchema,
  type StartCategory,
  type StartPrimaryNeed,
  type StartSourceType
} from "@/lib/start-projects/validation";

export const START_SOURCE_LABELS: Record<StartSourceType, string> = {
  DESIGN: "我有设计作品",
  IDEA: "我有产品想法",
  AUDIENCE: "我有粉丝或客户",
  STORE: "我有服装店",
  BRAND: "我已经有品牌"
};

export const START_CATEGORY_LABELS: Record<StartCategory, string> = {
  DRESS: "连衣裙",
  SHIRT: "衬衫",
  OUTERWEAR: "外套",
  SET: "套装",
  SKIRT: "半身裙",
  PANTS: "裤装",
  LIGHT_FORMAL: "轻礼服",
  KNIT: "针织",
  OTHER: "其他"
};

export const START_NEED_LABELS: Record<StartPrimaryNeed, string> = {
  DESIGN_DIRECTION: "找设计方向",
  FABRIC: "找面料",
  SAMPLE: "做样衣",
  PRODUCTION: "找小单生产",
  MARKET_VALIDATION: "验证市场",
  UNSURE: "我还不确定"
};

export const PROJECT_INTAKE_STATUS_LABELS: Record<ProjectIntakeStatus, string> = {
  DRAFT: "启动草稿",
  READY_FOR_REVIEW: "准备评估"
};

export const projectIntakeListSelect = {
  id: true,
  ownerId: true,
  clientDraftId: true,
  sourceType: true,
  category: true,
  categoryOther: true,
  primaryNeed: true,
  ideaText: true,
  status: true,
  completion: true,
  linkedWorkId: true,
  linkedCollaborationProjectId: true,
  linkedIncubationProjectId: true,
  submittedForReviewAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProjectIntakeSelect;

export type ProjectIntakeListItem = Prisma.ProjectIntakeGetPayload<{ select: typeof projectIntakeListSelect }>;

function isActiveAdmin(user: Pick<User, "role" | "status"> | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text.replace(/\s+/g, " ") : null;
}

function isStartSource(value: string): value is StartSourceType {
  return START_SOURCE_VALUES.includes(value as StartSourceType);
}

function isStartCategory(value: string): value is StartCategory {
  return START_CATEGORY_VALUES.includes(value as StartCategory);
}

function isStartNeed(value: string): value is StartPrimaryNeed {
  return START_NEED_VALUES.includes(value as StartPrimaryNeed);
}

export function sourceLabel(value: string) {
  return isStartSource(value) ? START_SOURCE_LABELS[value] : "启动项目";
}

export function categoryLabel(value: string, other?: string | null) {
  if (value === "OTHER" && other?.trim()) return other.trim();
  return isStartCategory(value) ? START_CATEGORY_LABELS[value] : "服装产品";
}

export function needLabel(value: string) {
  return isStartNeed(value) ? START_NEED_LABELS[value] : "梳理项目";
}

export function projectIntakeTitle(intake: Pick<ProjectIntakeListItem, "category" | "categoryOther">) {
  return `我的${categoryLabel(intake.category, intake.categoryOther)}项目`;
}

export function projectIntakeNextAction(intake: Pick<ProjectIntakeListItem, "status" | "ideaText">) {
  if (intake.status === ProjectIntakeStatus.READY_FOR_REVIEW) {
    return {
      label: "等待平台评估",
      description: "资料已经进入评估准备状态，后续会由平台在现有项目体系中继续处理。"
    };
  }

  if (!cleanText(intake.ideaText)) {
    return {
      label: "补充一句项目想法",
      description: "用一句话说明你想做的产品，后续再慢慢完善细节。"
    };
  }

  return {
    label: "完善项目定位",
    description: "下一步先明确使用场景、目标人群和大致价格带。"
  };
}

export function canViewProjectIntake(user: Pick<User, "id" | "role" | "status"> | null | undefined, intake: Pick<ProjectIntake, "ownerId">) {
  if (!user || user.status !== UserStatus.ACTIVE) return false;
  return user.id === intake.ownerId || isActiveAdmin(user);
}

export function parseProjectIntakeCreateInput(input: unknown) {
  return projectIntakeCreateSchema.safeParse(input);
}

export function parseProjectIntakePatchInput(input: unknown) {
  return projectIntakePatchSchema.safeParse(input);
}

function completionFor(input: { sourceType?: string | null; category?: string | null; primaryNeed?: string | null; ideaText?: string | null }) {
  let completion = 0;
  if (input.sourceType) completion += 25;
  if (input.category) completion += 25;
  if (input.primaryNeed) completion += 25;
  if (cleanText(input.ideaText)) completion += 10;
  return Math.min(completion, 85);
}

export async function createProjectIntakeForUser(userId: string, rawInput: unknown) {
  const parsed = parseProjectIntakeCreateInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "启动信息有误。" };
  }

  const input = parsed.data;
  const data = {
    ownerId: userId,
    clientDraftId: input.clientDraftId,
    sourceType: input.sourceType,
    category: input.category,
    categoryOther: input.category === "OTHER" ? cleanText(input.categoryOther) : null,
    primaryNeed: input.primaryNeed,
    ideaText: cleanText(input.ideaText),
    status: ProjectIntakeStatus.DRAFT,
    completion: completionFor(input)
  };

  const intake = await prisma.projectIntake.upsert({
    where: {
      ownerId_clientDraftId: {
        ownerId: userId,
        clientDraftId: input.clientDraftId
      }
    },
    create: data,
    update: {
      sourceType: data.sourceType,
      category: data.category,
      categoryOther: data.categoryOther,
      primaryNeed: data.primaryNeed,
      ideaText: data.ideaText,
      completion: data.completion
    },
    select: projectIntakeListSelect
  });

  console.info("Project intake saved", {
    route: "/api/start-projects",
    userId,
    intakeId: intake.id,
    status: intake.status
  });

  return { ok: true as const, intake };
}

export async function getProjectIntakesForUser(userId: string) {
  return prisma.projectIntake.findMany({
    where: { ownerId: userId },
    select: projectIntakeListSelect,
    orderBy: { updatedAt: "desc" },
    take: 40
  });
}

export async function getProjectIntakeForViewer(id: string, user: Pick<User, "id" | "role" | "status">) {
  const intake = await prisma.projectIntake.findUnique({
    where: { id },
    select: projectIntakeListSelect
  });

  if (!intake || !canViewProjectIntake(user, intake)) return null;
  return intake;
}

export async function updateProjectIntakeForViewer(id: string, user: Pick<User, "id" | "role" | "status">, rawInput: unknown) {
  const parsed = parseProjectIntakePatchInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "启动信息有误。" };
  }

  const current = await prisma.projectIntake.findUnique({
    where: { id },
    select: projectIntakeListSelect
  });

  if (!current) {
    return { ok: false as const, status: 404, error: "启动草稿不存在。" };
  }

  if (!canViewProjectIntake(user, current)) {
    return { ok: false as const, status: 403, error: "没有权限操作该启动草稿。" };
  }

  const input = parsed.data;
  const nextSourceType = input.sourceType ?? current.sourceType;
  const nextCategory = input.category ?? current.category;
  const nextPrimaryNeed = input.primaryNeed ?? current.primaryNeed;
  const nextIdeaText = input.ideaText === undefined ? current.ideaText : cleanText(input.ideaText);
  const nextStatus = input.status ?? current.status;

  const intake = await prisma.projectIntake.update({
    where: { id },
    data: {
      sourceType: nextSourceType,
      category: nextCategory,
      categoryOther: nextCategory === "OTHER" ? cleanText(input.categoryOther ?? current.categoryOther) : null,
      primaryNeed: nextPrimaryNeed,
      ideaText: nextIdeaText,
      status: nextStatus,
      completion: completionFor({
        sourceType: nextSourceType,
        category: nextCategory,
        primaryNeed: nextPrimaryNeed,
        ideaText: nextIdeaText
      }),
      submittedForReviewAt: nextStatus === ProjectIntakeStatus.READY_FOR_REVIEW ? current.submittedForReviewAt ?? new Date() : current.submittedForReviewAt
    },
    select: projectIntakeListSelect
  });

  return { ok: true as const, intake };
}
