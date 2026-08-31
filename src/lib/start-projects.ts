import {
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionType,
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  ContentStatus,
  NotificationType,
  Prisma,
  ProjectIntakeEventType,
  ProjectIntakeStatus,
  ProjectCommerceStage,
  ProjectStageStatus,
  ReviewStatus,
  UserRole,
  UserStatus,
  type ProjectIntake,
  type User
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeNotificationSummary, sanitizeNotificationTargetUrl } from "@/lib/notifications";
import { createInitialPrivateProjectActionForIntake, createProjectCreatedEventForConversion } from "@/lib/private-project-actions";
import {
  EXPECTED_PRICE_BAND_VALUES,
  LAUNCH_TIMING_VALUES,
  START_CATEGORY_VALUES,
  START_NEED_VALUES,
  START_SOURCE_VALUES,
  USE_SCENARIO_VALUES,
  projectIntakeCreateSchema,
  projectIntakeConversionSchema,
  projectIntakePatchSchema,
  projectIntakeReviewSchema,
  type ExpectedPriceBand,
  type LaunchTiming,
  type ProjectIntakeReviewDecision,
  type StartCategory,
  type StartPrimaryNeed,
  type StartSourceType,
  type UseScenario
} from "@/lib/start-projects/validation";

export const START_SOURCE_LABELS: Record<StartSourceType, string> = {
  DESIGN: "我有设计作品",
  IDEA: "我有产品想法",
  NEED: "我想要一件衣服",
  AUDIENCE: "我有粉丝或客户",
  STORE: "我有服装店",
  BRAND: "我已经有品牌"
};

export const START_CATEGORY_LABELS: Record<StartCategory, string> = {
  DRESS: "连衣裙",
  TOP: "上衣",
  SHIRT: "衬衫",
  TSHIRT: "T恤",
  HOODIE: "卫衣",
  OUTERWEAR: "外套",
  SET: "套装",
  SKIRT: "半身裙",
  PANTS: "裤装",
  LIGHT_FORMAL: "轻礼服",
  KNIT: "针织",
  SUIT: "西装",
  DENIM: "牛仔",
  SPORTSWEAR: "运动服",
  SWIMWEAR: "泳装",
  LINGERIE: "内衣",
  CHILDRENSWEAR: "童装",
  FORMALWEAR: "礼服",
  ACCESSORY: "配饰",
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

export const USE_SCENARIO_LABELS: Record<UseScenario, string> = {
  DAILY_COMMUTE: "日常通勤",
  WEEKEND: "周末休闲",
  DATE_PARTY: "聚会约会",
  FORMAL: "正式场合",
  TRAVEL: "旅行度假",
  STAGE_PHOTO: "舞台或拍摄",
  STORE_SALES: "店铺销售",
  OTHER: "其他",
  UNSURE: "目前还不确定"
};

export const EXPECTED_PRICE_BAND_LABELS: Record<ExpectedPriceBand, string> = {
  UNDER_299: "299元以内",
  FROM_300_TO_599: "300-599元",
  FROM_600_TO_999: "600-999元",
  FROM_1000_TO_1999: "1000-1999元",
  FROM_2000: "2000元以上",
  UNSURE: "目前还不确定"
};

export const LAUNCH_TIMING_LABELS: Record<LaunchTiming, string> = {
  WITHIN_30_DAYS: "30天内",
  ONE_TO_THREE_MONTHS: "1-3个月",
  THREE_TO_SIX_MONTHS: "3-6个月",
  EXPLORING: "还在探索"
};

export const PROJECT_INTAKE_STATUS_LABELS: Record<ProjectIntakeStatus, string> = {
  DRAFT: "启动草稿",
  READY_FOR_REVIEW: "可以提交评估",
  SUBMITTED: "等待平台评估",
  NEEDS_INFO: "需要补充资料",
  ACCEPTED: "已通过评估",
  DECLINED: "暂不适合推进"
};

export const PROJECT_INTAKE_EVENT_LABELS: Record<ProjectIntakeEventType, string> = {
  CREATED: "项目已启动",
  DETAILS_UPDATED: "项目资料已更新",
  SUBMITTED: "已提交平台评估",
  WITHDRAWN: "已撤回评估",
  NEEDS_INFO: "平台希望补充资料",
  RESUBMITTED: "已重新提交评估",
  ACCEPTED: "项目已通过评估",
  DECLINED: "项目暂不适合推进",
  CONVERTED: "项目已转为正式项目"
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
  projectTitle: true,
  targetAudience: true,
  useScenario: true,
  expectedPriceBand: true,
  launchTiming: true,
  demandMode: true,
  budgetMin: true,
  budgetMax: true,
  desiredDeliveryAt: true,
  requirements: true,
  referenceImages: true,
  reviewMessage: true,
  status: true,
  completion: true,
  reviewNote: true,
  reviewedAt: true,
  reviewedById: true,
  linkedWorkId: true,
  linkedWork: {
    select: {
      id: true,
      title: true,
      reviewStatus: true,
      images: {
        select: { imageUrl: true },
        orderBy: { sortOrder: "asc" as const },
        take: 1
      }
    }
  },
  linkedCollaborationProjectId: true,
  linkedIncubationProjectId: true,
  submittedForReviewAt: true,
  convertedAt: true,
  convertedById: true,
  linkedCollaborationProject: {
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      createdAt: true,
      updatedAt: true
    }
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProjectIntakeSelect;

export const projectIntakeDetailSelect = {
  ...projectIntakeListSelect,
  owner: {
    select: {
      id: true,
      nickname: true,
      persona: true,
      createdAt: true
    }
  },
  reviewedBy: {
    select: {
      id: true,
      nickname: true
    }
  },
  convertedBy: {
    select: {
      id: true,
      nickname: true
    }
  },
  events: {
    select: {
      id: true,
      eventType: true,
      note: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          nickname: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" as const },
    take: 50
  }
} satisfies Prisma.ProjectIntakeSelect;

export const adminProjectIntakeListSelect = {
  ...projectIntakeListSelect,
  owner: {
    select: {
      id: true,
      nickname: true,
      persona: true,
      createdAt: true
    }
  }
} satisfies Prisma.ProjectIntakeSelect;

export type ProjectIntakeListItem = Prisma.ProjectIntakeGetPayload<{ select: typeof projectIntakeListSelect }>;
export type ProjectIntakeDetail = Prisma.ProjectIntakeGetPayload<{ select: typeof projectIntakeDetailSelect }>;
export type AdminProjectIntakeListItem = Prisma.ProjectIntakeGetPayload<{ select: typeof adminProjectIntakeListSelect }>;

type Viewer = Pick<User, "id" | "role" | "status">;
type IntakeForCompletion = Pick<
  ProjectIntakeListItem,
  "sourceType" | "category" | "primaryNeed" | "ideaText" | "targetAudience" | "useScenario" | "expectedPriceBand" | "launchTiming"
>;

function isActiveAdmin(user: Pick<User, "role" | "status"> | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text.replace(/\s+/g, " ") : null;
}

function trimText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
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

function isUseScenario(value?: string | null): value is UseScenario {
  return Boolean(value && USE_SCENARIO_VALUES.includes(value as UseScenario));
}

function isExpectedPriceBand(value?: string | null): value is ExpectedPriceBand {
  return Boolean(value && EXPECTED_PRICE_BAND_VALUES.includes(value as ExpectedPriceBand));
}

function isLaunchTiming(value?: string | null): value is LaunchTiming {
  return Boolean(value && LAUNCH_TIMING_VALUES.includes(value as LaunchTiming));
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

export function useScenarioLabel(value?: string | null) {
  return isUseScenario(value) ? USE_SCENARIO_LABELS[value] : "未填写";
}

export function expectedPriceBandLabel(value?: string | null) {
  return isExpectedPriceBand(value) ? EXPECTED_PRICE_BAND_LABELS[value] : "未填写";
}

export function launchTimingLabel(value?: string | null) {
  return isLaunchTiming(value) ? LAUNCH_TIMING_LABELS[value] : "未填写";
}

export function projectIntakeTitle(intake: Pick<ProjectIntakeListItem, "category" | "categoryOther" | "projectTitle">) {
  return cleanText(intake.projectTitle) ?? `我的${categoryLabel(intake.category, intake.categoryOther)}项目`;
}

export function calculateProjectIntakeCompletion(intake: Partial<IntakeForCompletion>) {
  const checks = [
    Boolean(intake.sourceType),
    Boolean(intake.category),
    Boolean(intake.primaryNeed),
    Boolean(cleanText(intake.ideaText)),
    Boolean(cleanText(intake.targetAudience)),
    isUseScenario(intake.useScenario),
    isExpectedPriceBand(intake.expectedPriceBand),
    isLaunchTiming(intake.launchTiming)
  ];
  const answered = checks.filter(Boolean).length;
  return Math.round((answered / checks.length) * 100);
}

export function projectIntakeMissingFields(intake: Partial<IntakeForCompletion>) {
  const missing: string[] = [];
  if (!intake.sourceType) missing.push("项目来源");
  if (!intake.category) missing.push("产品品类");
  if (!intake.primaryNeed) missing.push("当前需求");
  if (!cleanText(intake.ideaText)) missing.push("一句话想法");
  if (!cleanText(intake.targetAudience)) missing.push("目标用户");
  if (!isUseScenario(intake.useScenario)) missing.push("穿着场景");
  if (!isExpectedPriceBand(intake.expectedPriceBand)) missing.push("价格范围");
  if (!isLaunchTiming(intake.launchTiming)) missing.push("启动时间");
  return missing;
}

export function isProjectIntakeComplete(intake: Partial<IntakeForCompletion>) {
  return calculateProjectIntakeCompletion(intake) === 100;
}

function statusFromCompleteness(status: ProjectIntakeStatus, completion: number) {
  if (status === ProjectIntakeStatus.DRAFT || status === ProjectIntakeStatus.READY_FOR_REVIEW) {
    return completion === 100 ? ProjectIntakeStatus.READY_FOR_REVIEW : ProjectIntakeStatus.DRAFT;
  }
  return status;
}

function withComputedState<T extends ProjectIntakeListItem | ProjectIntakeDetail | AdminProjectIntakeListItem>(intake: T): T {
  const completion = calculateProjectIntakeCompletion(intake);
  return {
    ...intake,
    completion,
    status: statusFromCompleteness(intake.status, completion)
  };
}

export function privateCollaborationProjectHref(projectId: string) {
  return `/me/projects/collaboration/${projectId}`;
}

export function projectIntakeNextAction(intake: Pick<ProjectIntakeListItem, "status" | "ideaText" | "completion" | "targetAudience" | "useScenario" | "expectedPriceBand" | "launchTiming" | "linkedCollaborationProjectId">) {
  const completion = calculateProjectIntakeCompletion(intake);
  const missing = projectIntakeMissingFields(intake);

  if (intake.status === ProjectIntakeStatus.SUBMITTED) {
    return {
      label: "正在准备项目",
      description: "我们正在根据当前资料准备项目工作台。"
    };
  }

  if (intake.status === ProjectIntakeStatus.NEEDS_INFO) {
    return completion === 100
      ? { label: "重新提交评估", description: "资料已经补充完整，可以重新提交给平台评估。" }
      : { label: "补充平台需要的资料", description: `还需要补充：${missing.join("、")}。` };
  }

  if (intake.status === ProjectIntakeStatus.ACCEPTED) {
    if (intake.linkedCollaborationProjectId) {
      return {
        label: "继续",
        description: "项目已经启动，可以继续推进当前这一步。"
      };
    }
    return {
      label: "正在准备下一步",
      description: "我们会根据当前进度继续推进。"
    };
  }

  if (intake.status === ProjectIntakeStatus.DECLINED) {
    return {
      label: "开始一个新项目",
      description: "原项目资料会保留，你也可以根据反馈重新整理一个新的项目起点。"
    };
  }

  if (completion === 100) {
    return {
      label: "启动项目",
      description: "资料已经足够，启动后会直接进入项目工作台。"
    };
  }

  if (!cleanText(intake.ideaText)) {
    return {
      label: "补充一句项目想法",
      description: "用一句话说明你想做的产品，后续再慢慢完善细节。"
    };
  }

  return {
    label: "完善项目资料",
    description: `还需要补充：${missing.join("、")}。`
  };
}

export function canViewProjectIntake(user: Pick<User, "id" | "role" | "status"> | null | undefined, intake: Pick<ProjectIntake, "ownerId">) {
  if (!user || user.status !== UserStatus.ACTIVE) return false;
  return user.id === intake.ownerId || isActiveAdmin(user);
}

const OWNER_MUTABLE_STATUSES: ProjectIntakeStatus[] = [ProjectIntakeStatus.DRAFT, ProjectIntakeStatus.READY_FOR_REVIEW, ProjectIntakeStatus.NEEDS_INFO];

function canOwnerMutate(status: ProjectIntakeStatus) {
  return OWNER_MUTABLE_STATUSES.includes(status);
}

function projectIntakeSafeUrl(id: string) {
  return `/me/start-projects/${id}`;
}

function eventTypeForDecision(decision: ProjectIntakeReviewDecision) {
  if (decision === "ACCEPTED") return ProjectIntakeEventType.ACCEPTED;
  if (decision === "NEEDS_INFO") return ProjectIntakeEventType.NEEDS_INFO;
  return ProjectIntakeEventType.DECLINED;
}

function notificationCopy(decision: ProjectIntakeReviewDecision) {
  if (decision === "ACCEPTED") {
    return {
      title: "项目已通过平台评估",
      content: "你的项目已通过平台评估。后续不会自动创建正式项目，平台会安排下一步。"
    };
  }
  if (decision === "NEEDS_INFO") {
    return {
      title: "项目需要补充资料",
      content: "平台已给出需要补充的内容，请回到项目详情查看。"
    };
  }
  return {
    title: "项目评估已有结果",
    content: "平台已给出评估结果，请回到项目详情查看反馈。"
  };
}

async function createProjectIntakeNotification(tx: Prisma.TransactionClient, input: { ownerId: string; actorId: string; intakeId: string; decision: ProjectIntakeReviewDecision }) {
  const copy = notificationCopy(input.decision);
  const linkUrl = sanitizeNotificationTargetUrl(projectIntakeSafeUrl(input.intakeId));
  const title = safeNotificationSummary(copy.title, 120);
  const content = safeNotificationSummary(copy.content, 240);

  const duplicate = await tx.notification.findFirst({
    where: {
      userId: input.ownerId,
      type: NotificationType.REQUEST_HANDLED,
      title,
      linkUrl,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
    },
    select: { id: true }
  });
  if (duplicate) return duplicate;

  return tx.notification.create({
    data: {
      userId: input.ownerId,
      type: NotificationType.REQUEST_HANDLED,
      title,
      content,
      linkUrl
    }
  });
}

async function createProjectIntakeConvertedNotification(tx: Prisma.TransactionClient, input: { ownerId: string; projectId: string }) {
  const linkUrl = sanitizeNotificationTargetUrl(privateCollaborationProjectHref(input.projectId));
  const title = safeNotificationSummary("项目已启动", 120);
  const content = safeNotificationSummary("你的项目已经准备好，可以继续查看后续安排。", 240);

  const duplicate = await tx.notification.findFirst({
    where: {
      userId: input.ownerId,
      type: NotificationType.REQUEST_HANDLED,
      title,
      linkUrl,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
    },
    select: { id: true }
  });
  if (duplicate) return duplicate;

  return tx.notification.create({
    data: {
      userId: input.ownerId,
      type: NotificationType.REQUEST_HANDLED,
      title,
      content,
      linkUrl
    }
  });
}

function conversionProjectSummary(intake: ProjectIntakeListItem) {
  return [categoryLabel(intake.category, intake.categoryOther), needLabel(intake.primaryNeed), useScenarioLabel(intake.useScenario)]
    .filter(Boolean)
    .join(" / ");
}

function conversionProjectDescription(intake: ProjectIntakeListItem) {
  const idea = cleanText(intake.ideaText);
  const audience = cleanText(intake.targetAudience);
  return [idea, audience ? `目标用户：${audience}` : null].filter(Boolean).join("\n");
}

function initialActionForProjectIntake(intake: ProjectIntakeListItem) {
  const category = categoryLabel(intake.category, intake.categoryOther);

  if (intake.sourceType === "DESIGN") {
    return {
      type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
      responsibility: CollaborationProjectActionResponsibility.USER,
      title: "确认开发目标",
      instructions: `请确认这件${category}接下来最想解决的开发目标，例如版型方向、面料手感、样衣重点或目标穿着场景。`
    };
  }

  return {
    type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
    responsibility: CollaborationProjectActionResponsibility.USER,
    title: "完善产品需求",
    instructions: `补充你希望的${category}款式方向、颜色、使用场景和关键要求。也可以参考已有服装款式整理需求。`
  };
}

function conversionConflictMessage() {
  return "项目状态已更新，请刷新后重试。";
}

export function parseProjectIntakeCreateInput(input: unknown) {
  return projectIntakeCreateSchema.safeParse(input);
}

export function parseProjectIntakePatchInput(input: unknown) {
  return projectIntakePatchSchema.safeParse(input);
}

export function parseProjectIntakeReviewInput(input: unknown) {
  return projectIntakeReviewSchema.safeParse(input);
}

export function parseProjectIntakeConversionInput(input: unknown) {
  return projectIntakeConversionSchema.safeParse(input);
}

function createDataForUser(userId: string, input: ReturnType<typeof projectIntakeCreateSchema.parse>) {
  const data = {
    ownerId: userId,
    clientDraftId: input.clientDraftId,
    sourceType: input.sourceType,
    linkedWorkId: input.sourceType === "DESIGN" ? input.linkedWorkId : null,
    category: input.category,
    categoryOther: input.category === "OTHER" ? cleanText(input.categoryOther) : null,
    primaryNeed: input.primaryNeed,
    ideaText: cleanText(input.ideaText),
    demandMode: input.demandMode,
    useScenario: input.useScenario ?? null,
    expectedPriceBand: input.expectedPriceBand ?? null,
    launchTiming: input.launchTiming ?? null
  };
  const completion = calculateProjectIntakeCompletion(data);

  return {
    ...data,
    status: statusFromCompleteness(ProjectIntakeStatus.DRAFT, completion),
    completion
  };
}

export async function createProjectIntakeForUser(userId: string, rawInput: unknown) {
  const parsed = parseProjectIntakeCreateInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "启动信息有误。" };
  }

  const input = parsed.data;

  if (input.sourceType === "DESIGN") {
    const ownedWork = await prisma.work.findFirst({
      where: {
        id: input.linkedWorkId ?? "",
        userId,
        contentStatus: { in: [ContentStatus.VISIBLE, ContentStatus.HIDDEN] },
        reviewStatus: { in: [ReviewStatus.PENDING, ReviewStatus.APPROVED, ReviewStatus.PUBLISHED] }
      },
      select: { id: true }
    });
    if (!ownedWork) return { ok: false as const, error: "所选作品不存在、不可用或不属于当前账号。" };
  }

  try {
    const intake = await prisma.$transaction(async (tx) => {
      const existing = await tx.projectIntake.findUnique({
        where: {
          ownerId_clientDraftId: {
            ownerId: userId,
            clientDraftId: input.clientDraftId
          }
        },
        select: projectIntakeListSelect
      });

      if (existing) {
        if (!OWNER_MUTABLE_STATUSES.includes(existing.status)) {
          return existing;
        }

        const nextData = createDataForUser(userId, input);
        const nextCompletion = calculateProjectIntakeCompletion({
          ...existing,
          ...nextData
        });

        return tx.projectIntake.update({
          where: { id: existing.id },
          data: {
            sourceType: nextData.sourceType,
            linkedWorkId: nextData.linkedWorkId,
            category: nextData.category,
            categoryOther: nextData.categoryOther,
            primaryNeed: nextData.primaryNeed,
            ideaText: nextData.ideaText,
            demandMode: nextData.demandMode,
            useScenario: nextData.useScenario,
            expectedPriceBand: nextData.expectedPriceBand,
            launchTiming: nextData.launchTiming,
            completion: nextCompletion,
            status: existing.status === ProjectIntakeStatus.NEEDS_INFO ? ProjectIntakeStatus.NEEDS_INFO : statusFromCompleteness(existing.status, nextCompletion)
          },
          select: projectIntakeListSelect
        });
      }

      const nextData = createDataForUser(userId, input);
      return tx.projectIntake.create({
        data: {
          ...nextData,
          events: {
            create: {
              actorId: userId,
              eventType: ProjectIntakeEventType.CREATED
            }
          }
        },
        select: projectIntakeListSelect
      });
    });

    console.info("Project intake saved", {
      route: "/api/start-projects",
      userId,
      intakeId: intake.id,
      status: intake.status
    });

    return { ok: true as const, intake: withComputedState(intake) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.projectIntake.findUnique({
        where: {
          ownerId_clientDraftId: {
            ownerId: userId,
            clientDraftId: input.clientDraftId
          }
        },
        select: projectIntakeListSelect
      });
      if (existing) return { ok: true as const, intake: withComputedState(existing) };
    }
    console.error("Project intake create failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { ok: false as const, error: "项目启动失败，请稍后再试。" };
  }
}

export async function getProjectIntakesForUser(userId: string) {
  const items = await prisma.projectIntake.findMany({
    where: { ownerId: userId, linkedCollaborationProjectId: null },
    select: projectIntakeListSelect,
    orderBy: { updatedAt: "desc" },
    take: 40
  });
  return items.map(withComputedState);
}

export async function getProjectIntakeForViewer(id: string, user: Viewer) {
  const intake = await prisma.projectIntake.findUnique({
    where: { id },
    select: projectIntakeDetailSelect
  });

  if (!intake || !canViewProjectIntake(user, intake)) return null;
  return withComputedState(intake);
}

export async function updateProjectIntakeForViewer(id: string, user: Viewer, rawInput: unknown) {
  const parsed = parseProjectIntakePatchInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "项目信息有误。" };
  }

  const input = parsed.data;

  return prisma.$transaction(async (tx) => {
    const current = await tx.projectIntake.findUnique({
      where: { id },
      select: projectIntakeListSelect
    });

    if (!current) {
      return { ok: false as const, status: 404, error: "启动草稿不存在。" };
    }

    if (user.status !== UserStatus.ACTIVE || current.ownerId !== user.id) {
      return { ok: false as const, status: 403, error: "没有权限操作该启动草稿。" };
    }

    if (!canOwnerMutate(current.status)) {
      return { ok: false as const, status: 409, error: "当前状态不能直接修改资料。" };
    }

    const nextSourceType = input.sourceType ?? current.sourceType;
    const nextCategory = input.category ?? current.category;
    const nextPrimaryNeed = input.primaryNeed ?? current.primaryNeed;
    const nextIdeaText = input.ideaText === undefined ? current.ideaText : cleanText(input.ideaText);
    const nextProjectTitle = input.projectTitle === undefined ? current.projectTitle : cleanText(input.projectTitle);
    const nextTargetAudience = input.targetAudience === undefined ? current.targetAudience : cleanText(input.targetAudience);
    const nextUseScenario = input.useScenario === undefined ? current.useScenario : input.useScenario;
    const nextExpectedPriceBand = input.expectedPriceBand === undefined ? current.expectedPriceBand : input.expectedPriceBand;
    const nextLaunchTiming = input.launchTiming === undefined ? current.launchTiming : input.launchTiming;
    const nextReviewMessage = input.reviewMessage === undefined ? current.reviewMessage : trimText(input.reviewMessage);
    const nextCompletion = calculateProjectIntakeCompletion({
      sourceType: nextSourceType,
      category: nextCategory,
      primaryNeed: nextPrimaryNeed,
      ideaText: nextIdeaText,
      targetAudience: nextTargetAudience,
      useScenario: nextUseScenario,
      expectedPriceBand: nextExpectedPriceBand,
      launchTiming: nextLaunchTiming
    });
    const nextStatus =
      current.status === ProjectIntakeStatus.NEEDS_INFO ? ProjectIntakeStatus.NEEDS_INFO : statusFromCompleteness(current.status, nextCompletion);

    await tx.projectIntake.update({
      where: { id },
      data: {
        sourceType: nextSourceType,
        category: nextCategory,
        categoryOther: nextCategory === "OTHER" ? cleanText(input.categoryOther ?? current.categoryOther) : null,
        primaryNeed: nextPrimaryNeed,
        ideaText: nextIdeaText,
        projectTitle: nextProjectTitle,
        targetAudience: nextTargetAudience,
        useScenario: nextUseScenario,
        expectedPriceBand: nextExpectedPriceBand,
        launchTiming: nextLaunchTiming,
        reviewMessage: nextReviewMessage,
        status: nextStatus,
        completion: nextCompletion
      },
    });

    await tx.projectIntakeEvent.create({
      data: {
        intakeId: id,
        actorId: user.id,
        eventType: ProjectIntakeEventType.DETAILS_UPDATED,
        note: "项目资料已更新"
      }
    });

    const intake = await tx.projectIntake.findUniqueOrThrow({
      where: { id },
      select: projectIntakeDetailSelect
    });

    return { ok: true as const, intake: withComputedState(intake) };
  });
}

export async function submitProjectIntakeReview(id: string, user: Viewer) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.projectIntake.findUnique({
            where: { id },
            select: projectIntakeListSelect
          });

          if (!current) return { ok: false as const, status: 404, error: "启动资料不存在。" };
          if (user.status !== UserStatus.ACTIVE || current.ownerId !== user.id) return { ok: false as const, status: 403, error: "没有权限启动该项目。" };

          if (current.linkedCollaborationProjectId) {
            const project = current.linkedCollaborationProject;
            if (!project) return { ok: false as const, status: 409, error: "项目关联暂不可用，请稍后再试。" };
            const intake = await tx.projectIntake.findUniqueOrThrow({
              where: { id },
              select: projectIntakeDetailSelect
            });
            return { ok: true as const, intake: withComputedState(intake), project, idempotent: true };
          }

          if (current.status === ProjectIntakeStatus.DECLINED) {
            return { ok: false as const, status: 409, error: "该项目暂不适合继续推进，可以重新启动一个新项目。" };
          }
          const launchableStatuses: ProjectIntakeStatus[] = [
            ProjectIntakeStatus.READY_FOR_REVIEW,
            ProjectIntakeStatus.NEEDS_INFO,
            ProjectIntakeStatus.SUBMITTED,
            ProjectIntakeStatus.ACCEPTED
          ];
          if (!launchableStatuses.includes(current.status)) {
            return { ok: false as const, status: 409, error: "请先补充完整资料，再启动项目。" };
          }

          const completion = calculateProjectIntakeCompletion(current);
          if (completion !== 100) {
            return { ok: false as const, status: 400, error: `还需要补充：${projectIntakeMissingFields(current).join("、")}。` };
          }

          const now = new Date();
          const project = await tx.collaborationProject.create({
            data: {
              title: projectIntakeTitle(current),
              ownerUserId: current.ownerId,
              createdById: user.id,
              description: conversionProjectDescription(current) || null,
              summary: conversionProjectSummary(current) || null,
              status: current.demandMode === "PUBLIC_COCREATION" ? CollaborationProjectStatus.SEEKING_PROPOSALS : CollaborationProjectStatus.DRAFT,
              visibility: current.demandMode === "PUBLIC_COCREATION" ? CollaborationProjectVisibility.PUBLIC : CollaborationProjectVisibility.PRIVATE,
              demandMode: current.demandMode,
              category: current.category === "OTHER" ? current.categoryOther : current.category,
              useScenario: current.useScenario,
              currentCommerceStage: ProjectCommerceStage.DESIGN,
              targetPriceMin: current.budgetMin,
              targetPriceMax: current.budgetMax,
              estimatedShipDate: current.desiredDeliveryAt,
              internalNote: `Auto-created from ProjectIntake ${current.id}`,
              commerceStages: {
                create: [
                  { stage: ProjectCommerceStage.DESIGN, status: ProjectStageStatus.OPEN, title: "设计方案", opensAt: now },
                  { stage: ProjectCommerceStage.FABRIC, status: ProjectStageStatus.BLOCKED, title: "面料匹配" },
                  { stage: ProjectCommerceStage.SAMPLE, status: ProjectStageStatus.BLOCKED, title: "制版打样" },
                  { stage: ProjectCommerceStage.PRODUCTION, status: ProjectStageStatus.BLOCKED, title: "小批量生产" }
                ]
              }
            },
            select: {
              id: true,
              title: true,
              status: true,
              visibility: true,
              createdAt: true,
              updatedAt: true
            }
          });

          const updated = await tx.projectIntake.updateMany({
            where: {
              id,
              ownerId: user.id,
              linkedCollaborationProjectId: null,
              convertedAt: null,
              status: current.status,
              updatedAt: current.updatedAt
            },
            data: {
              status: ProjectIntakeStatus.ACCEPTED,
              completion,
              submittedForReviewAt: current.submittedForReviewAt ?? now,
              reviewedById: null,
              reviewedAt: current.reviewedAt ?? now,
              reviewNote: current.reviewNote ?? "项目已自动启动。",
              linkedCollaborationProjectId: project.id,
              convertedAt: now,
              convertedById: user.id
            }
          });

          if (updated.count !== 1) {
            throw new ProjectIntakeConversionConflictError();
          }

          if (current.status !== ProjectIntakeStatus.SUBMITTED && current.status !== ProjectIntakeStatus.ACCEPTED) {
            await tx.projectIntakeEvent.create({
              data: {
                intakeId: id,
                actorId: user.id,
                eventType: current.status === ProjectIntakeStatus.NEEDS_INFO ? ProjectIntakeEventType.RESUBMITTED : ProjectIntakeEventType.SUBMITTED,
                note: "用户启动项目"
              }
            });
          }

          await tx.projectIntakeEvent.create({
            data: {
              intakeId: id,
              actorId: user.id,
              eventType: ProjectIntakeEventType.ACCEPTED,
              note: "系统自动进入项目工作台"
            }
          });

          await tx.projectIntakeEvent.create({
            data: {
              intakeId: id,
              actorId: user.id,
              eventType: ProjectIntakeEventType.CONVERTED,
              note: "项目已自动建立"
            }
          });

          await createProjectCreatedEventForConversion(tx, {
            projectId: project.id,
            actorId: user.id
          });

          const initialAction = initialActionForProjectIntake(current);
          await createInitialPrivateProjectActionForIntake(tx, {
            projectId: project.id,
            ownerId: current.ownerId,
            actorId: user.id,
            ...initialAction
          });

          await createProjectIntakeConvertedNotification(tx, {
            ownerId: current.ownerId,
            projectId: project.id
          });

          const intake = await tx.projectIntake.findUniqueOrThrow({
            where: { id },
            select: projectIntakeDetailSelect
          });

          return { ok: true as const, intake: withComputedState(intake), project, idempotent: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const latest = await prisma.projectIntake.findFirst({
        where: { id, ownerId: user.id },
        select: projectIntakeDetailSelect
      });
      const project = latest?.linkedCollaborationProject as ConvertedProjectShape | null | undefined;
      if (project) {
        return { ok: true as const, intake: withComputedState(latest!), project, idempotent: true };
      }
      if (isRetryableConversionError(error) && attempt < maxAttempts) continue;
      if (isRetryableConversionError(error)) {
        return { ok: false as const, status: 409, error: conversionConflictMessage() };
      }
      console.error("Project intake launch failed", { errorType: error instanceof Error ? error.name : typeof error });
      return { ok: false as const, status: 500, error: "项目启动失败，请稍后再试。" };
    }
  }

  return { ok: false as const, status: 409, error: conversionConflictMessage() };
}

export async function withdrawProjectIntakeReview(id: string, user: Viewer) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.projectIntake.findUnique({
      where: { id },
      select: projectIntakeListSelect
    });

    if (!current) return { ok: false as const, status: 404, error: "启动草稿不存在。" };
    if (user.status !== UserStatus.ACTIVE || current.ownerId !== user.id) return { ok: false as const, status: 403, error: "没有权限撤回该项目。" };
    if (current.status !== ProjectIntakeStatus.SUBMITTED) {
      if (current.status === ProjectIntakeStatus.DRAFT || current.status === ProjectIntakeStatus.READY_FOR_REVIEW) {
        const intake = await tx.projectIntake.findUniqueOrThrow({
          where: { id },
          select: projectIntakeDetailSelect
        });
        return { ok: true as const, intake: withComputedState(intake), idempotent: true };
      }
      return { ok: false as const, status: 409, error: "平台已经处理该项目，不能撤回评估。" };
    }

    const completion = calculateProjectIntakeCompletion(current);
    const nextStatus = completion === 100 ? ProjectIntakeStatus.READY_FOR_REVIEW : ProjectIntakeStatus.DRAFT;
    await tx.projectIntake.update({
      where: { id },
      data: {
        status: nextStatus,
        completion,
        submittedForReviewAt: null
      },
    });

    await tx.projectIntakeEvent.create({
      data: {
        intakeId: id,
        actorId: user.id,
        eventType: ProjectIntakeEventType.WITHDRAWN,
        note: "用户撤回评估并准备修改资料"
      }
    });

    const intake = await tx.projectIntake.findUniqueOrThrow({
      where: { id },
      select: projectIntakeDetailSelect
    });

    return { ok: true as const, intake: withComputedState(intake), idempotent: false };
  });
}

export async function reviewProjectIntakeAsAdmin(id: string, admin: Viewer, rawInput: unknown) {
  if (!isActiveAdmin(admin)) return { ok: false as const, status: 403, error: "没有后台权限。" };

  const parsed = parseProjectIntakeReviewInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "评估信息有误。" };
  }

  const input = parsed.data;
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  const note = trimText(input.note);

  return prisma.$transaction(async (tx) => {
    const current = await tx.projectIntake.findUnique({
      where: { id },
      select: projectIntakeListSelect
    });

    if (!current) return { ok: false as const, status: 404, error: "项目不存在。" };
    if (current.status !== ProjectIntakeStatus.SUBMITTED) return { ok: false as const, status: 409, error: "只有等待平台评估的项目可以处理。" };
    if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return { ok: false as const, status: 409, error: "项目资料已更新，请刷新后再处理。" };
    }

    const updated = await tx.projectIntake.updateMany({
      where: {
        id,
        status: ProjectIntakeStatus.SUBMITTED,
        updatedAt: expectedUpdatedAt
      },
      data: {
        status: input.decision,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNote: note
      }
    });

    if (updated.count !== 1) {
      return { ok: false as const, status: 409, error: "项目资料已更新，请刷新后再处理。" };
    }

    await tx.projectIntakeEvent.create({
      data: {
        intakeId: id,
        actorId: admin.id,
        eventType: eventTypeForDecision(input.decision),
        note
      }
    });

    await tx.adminLog.create({
      data: {
        adminId: admin.id,
        action: "PROJECT_INTAKE_REVIEW",
        targetType: "ProjectIntake",
        targetId: id,
        detail: {
          decision: input.decision
        }
      }
    });

    await createProjectIntakeNotification(tx, {
      ownerId: current.ownerId,
      actorId: admin.id,
      intakeId: id,
      decision: input.decision
    });

    const intake = await tx.projectIntake.findUniqueOrThrow({
      where: { id },
      select: projectIntakeDetailSelect
    });

    return { ok: true as const, intake: withComputedState(intake) };
  });
}

type ConvertedProjectShape = NonNullable<ProjectIntakeListItem["linkedCollaborationProject"]>;

class ProjectIntakeConversionConflictError extends Error {
  constructor() {
    super(conversionConflictMessage());
    this.name = "ProjectIntakeConversionConflictError";
  }
}

function isRetryableConversionError(error: unknown) {
  return error instanceof ProjectIntakeConversionConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034"));
}

async function getConvertedIntakeForAdmin(id: string, admin: Viewer) {
  if (!isActiveAdmin(admin)) return null;
  return prisma.projectIntake.findUnique({
    where: { id },
    select: projectIntakeDetailSelect
  });
}

export async function convertProjectIntakeToProject(id: string, admin: Viewer, rawInput: unknown) {
  if (!isActiveAdmin(admin)) return { ok: false as const, status: 403, error: "没有后台权限。" };

  const parsed = parseProjectIntakeConversionInput(rawInput);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? conversionConflictMessage() };
  }

  const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.projectIntake.findUnique({
            where: { id },
            select: projectIntakeListSelect
          });

          if (!current) return { ok: false as const, status: 404, error: "项目不存在。" };
          if (current.linkedCollaborationProjectId) {
            const project = current.linkedCollaborationProject;
            if (!project) return { ok: false as const, status: 409, error: "正式项目关联暂不可用，请联系管理员处理。" };
            const intake = await tx.projectIntake.findUniqueOrThrow({ where: { id }, select: projectIntakeDetailSelect });
            return { ok: true as const, intake: withComputedState(intake), project, idempotent: true };
          }
          if (current.status !== ProjectIntakeStatus.ACCEPTED) {
            return { ok: false as const, status: 409, error: "只有已通过评估且尚未建立正式项目的启动项目可以转化。" };
          }
          if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            return { ok: false as const, status: 409, error: conversionConflictMessage() };
          }

          const now = new Date();
          const project = await tx.collaborationProject.create({
            data: {
              title: projectIntakeTitle(current),
              ownerUserId: current.ownerId,
              createdById: admin.id,
              description: conversionProjectDescription(current) || null,
              summary: conversionProjectSummary(current) || null,
              status: current.demandMode === "PUBLIC_COCREATION" ? CollaborationProjectStatus.SEEKING_PROPOSALS : CollaborationProjectStatus.DRAFT,
              visibility: current.demandMode === "PUBLIC_COCREATION" ? CollaborationProjectVisibility.PUBLIC : CollaborationProjectVisibility.PRIVATE,
              demandMode: current.demandMode,
              category: current.category === "OTHER" ? current.categoryOther : current.category,
              useScenario: current.useScenario,
              currentCommerceStage: ProjectCommerceStage.DESIGN,
              targetPriceMin: current.budgetMin,
              targetPriceMax: current.budgetMax,
              estimatedShipDate: current.desiredDeliveryAt,
              internalNote: `Converted from ProjectIntake ${current.id}`,
              commerceStages: {
                create: [
                  { stage: ProjectCommerceStage.DESIGN, status: ProjectStageStatus.OPEN, title: "设计方案", opensAt: now },
                  { stage: ProjectCommerceStage.FABRIC, status: ProjectStageStatus.BLOCKED, title: "面料匹配" },
                  { stage: ProjectCommerceStage.SAMPLE, status: ProjectStageStatus.BLOCKED, title: "制版打样" },
                  { stage: ProjectCommerceStage.PRODUCTION, status: ProjectStageStatus.BLOCKED, title: "小批量生产" }
                ]
              }
            },
            select: {
              id: true,
              title: true,
              status: true,
              visibility: true,
              createdAt: true,
              updatedAt: true
            }
          });

          const updated = await tx.projectIntake.updateMany({
            where: {
              id,
              status: ProjectIntakeStatus.ACCEPTED,
              linkedCollaborationProjectId: null,
              convertedAt: null,
              updatedAt: expectedUpdatedAt
            },
            data: {
              linkedCollaborationProjectId: project.id,
              convertedAt: now,
              convertedById: admin.id
            }
          });

          if (updated.count !== 1) {
            throw new ProjectIntakeConversionConflictError();
          }

          await tx.projectIntakeEvent.create({
            data: {
              intakeId: id,
              actorId: admin.id,
              eventType: ProjectIntakeEventType.CONVERTED,
              note: "项目已转为正式项目"
            }
          });

          await createProjectCreatedEventForConversion(tx, {
            projectId: project.id,
            actorId: admin.id
          });

          await tx.adminLog.create({
            data: {
              adminId: admin.id,
              action: "PROJECT_INTAKE_CONVERT",
              targetType: "ProjectIntake",
              targetId: id,
              detail: {
                intakeId: id,
                collaborationProjectId: project.id,
                oldStatus: ProjectIntakeStatus.ACCEPTED,
                result: "CONVERTED",
                convertedAt: now.toISOString()
              }
            }
          });

          await createProjectIntakeConvertedNotification(tx, {
            ownerId: current.ownerId,
            projectId: project.id
          });

          const intake = await tx.projectIntake.findUniqueOrThrow({
            where: { id },
            select: projectIntakeDetailSelect
          });

          return { ok: true as const, intake: withComputedState(intake), project, idempotent: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const latest = await getConvertedIntakeForAdmin(id, admin);
      const project = latest?.linkedCollaborationProject as ConvertedProjectShape | null | undefined;
      if (project) {
        return { ok: true as const, intake: withComputedState(latest!), project, idempotent: true };
      }
      if (isRetryableConversionError(error) && attempt < maxAttempts) continue;
      if (isRetryableConversionError(error)) {
        return { ok: false as const, status: 409, error: conversionConflictMessage() };
      }
      console.error("Project intake conversion failed", { errorType: error instanceof Error ? error.name : typeof error });
      return { ok: false as const, status: 500, error: "正式项目建立失败，请稍后再试。" };
    }
  }

  return { ok: false as const, status: 409, error: conversionConflictMessage() };
}

export type ProjectIntakeAdminFilter = "WAITING" | "NEEDS_INFO" | "ACCEPTED" | "ACCEPTED_PENDING" | "CONVERTED" | "DECLINED" | "ALL";

export function normalizeProjectIntakeAdminFilter(value?: string | null): ProjectIntakeAdminFilter {
  if (value === "NEEDS_INFO" || value === "ACCEPTED" || value === "ACCEPTED_PENDING" || value === "CONVERTED" || value === "DECLINED" || value === "ALL") return value;
  return "WAITING";
}

export async function getAdminProjectIntakes({
  filter = "WAITING",
  page = 1,
  pageSize = 20
}: {
  filter?: ProjectIntakeAdminFilter;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(Math.max(1, Math.floor(pageSize)), 50);
  const where: Prisma.ProjectIntakeWhereInput =
    filter === "WAITING"
      ? { status: ProjectIntakeStatus.SUBMITTED }
      : filter === "ACCEPTED_PENDING"
        ? { status: ProjectIntakeStatus.ACCEPTED, linkedCollaborationProjectId: null }
        : filter === "CONVERTED"
          ? { linkedCollaborationProjectId: { not: null } }
          : filter === "ALL"
            ? {}
            : { status: filter as ProjectIntakeStatus };
  const [items, total] = await Promise.all([
    prisma.projectIntake.findMany({
      where,
      select: adminProjectIntakeListSelect,
      orderBy:
        filter === "WAITING"
          ? [{ submittedForReviewAt: "asc" }, { updatedAt: "asc" }]
          : [{ updatedAt: "desc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize
    }),
    prisma.projectIntake.count({ where })
  ]);

  return {
    items: items.map(withComputedState),
    total,
    page: safePage,
    pageSize: safePageSize,
    pageCount: Math.max(1, Math.ceil(total / safePageSize))
  };
}

export async function getProjectIntakeForAdmin(id: string, admin: Viewer) {
  if (!isActiveAdmin(admin)) return null;
  const intake = await prisma.projectIntake.findUnique({
    where: { id },
    select: projectIntakeDetailSelect
  });
  return intake ? withComputedState(intake) : null;
}
