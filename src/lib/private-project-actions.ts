import {
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionStatus,
  CollaborationProjectActionType,
  CollaborationProjectEventType,
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
  type User
} from "@prisma/client";
import { z } from "zod";
import { safeNotificationSummary, sanitizeNotificationTargetUrl } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type Viewer = Pick<User, "id" | "role" | "status">;
type Transaction = Prisma.TransactionClient;

export const OPEN_PRIVATE_PROJECT_ACTION_STATUSES = [
  CollaborationProjectActionStatus.ACTIVE,
  CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION
] as const;

export const PRIVATE_PROJECT_ACTION_TYPE_LABELS: Record<CollaborationProjectActionType, string> = {
  DESIGN_CLARIFICATION: "完善产品设计方向",
  FABRIC_BRIEF: "确认面料需求",
  SAMPLE_BRIEF: "准备打样需求",
  PRODUCTION_FEASIBILITY: "确认生产可行性",
  PLATFORM_PREPARATION: "等待平台准备下一阶段"
};

export const PRIVATE_PROJECT_ACTION_RESPONSIBILITY_LABELS: Record<CollaborationProjectActionResponsibility, string> = {
  USER: "需要你完成",
  PLATFORM: "平台正在处理"
};

export const PRIVATE_PROJECT_ACTION_STATUS_LABELS: Record<CollaborationProjectActionStatus, string> = {
  ACTIVE: "进行中",
  WAITING_PLATFORM_CONFIRMATION: "已提交，等待平台确认",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const PRIVATE_PROJECT_EVENT_LABELS: Record<CollaborationProjectEventType, string> = {
  PROJECT_CREATED: "正式项目已建立",
  ACTION_CREATED: "平台安排了下一步",
  USER_RESULT_SUBMITTED: "你提交了完成结果",
  ACTION_COMPLETED: "当前步骤已完成",
  ACTION_CANCELLED: "项目下一步已更新"
};

export const PRIVATE_PROJECT_STAGE_LABELS = {
  PROJECT_SETUP: "项目启动",
  DESIGN_DIRECTION: "设计方向",
  FABRIC_PREPARATION: "面料准备",
  SAMPLE_PREPARATION: "打样准备",
  PRODUCTION_PREPARATION: "生产准备"
} as const;

export type PrivateProjectStage = keyof typeof PRIVATE_PROJECT_STAGE_LABELS;

export const privateProjectActionSelect = {
  id: true,
  projectId: true,
  type: true,
  responsibility: true,
  status: true,
  title: true,
  instructions: true,
  dueAt: true,
  startedAt: true,
  userResultNote: true,
  userResultSubmittedAt: true,
  completedAt: true,
  completedById: true,
  completionNote: true,
  cancelledAt: true,
  cancelledById: true,
  cancellationReason: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      nickname: true,
      role: true
    }
  },
  completedBy: {
    select: {
      id: true,
      nickname: true,
      role: true
    }
  },
  cancelledBy: {
    select: {
      id: true,
      nickname: true,
      role: true
    }
  }
} satisfies Prisma.CollaborationProjectActionSelect;

export const privateProjectActionListSelect = {
  id: true,
  projectId: true,
  type: true,
  responsibility: true,
  status: true,
  title: true,
  dueAt: true,
  startedAt: true,
  userResultSubmittedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.CollaborationProjectActionSelect;

export const privateProjectEventSelect = {
  id: true,
  projectId: true,
  actionId: true,
  actorId: true,
  eventType: true,
  note: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      nickname: true,
      role: true
    }
  },
  action: {
    select: {
      id: true,
      title: true,
      type: true,
      responsibility: true,
      status: true
    }
  }
} satisfies Prisma.CollaborationProjectEventSelect;

export type PrivateProjectAction = Prisma.CollaborationProjectActionGetPayload<{ select: typeof privateProjectActionSelect }>;
export type PrivateProjectActionListItem = Prisma.CollaborationProjectActionGetPayload<{ select: typeof privateProjectActionListSelect }>;
export type PrivateProjectEvent = Prisma.CollaborationProjectEventGetPayload<{ select: typeof privateProjectEventSelect }>;

export type PrivateProjectAdminFilter = "TODO" | "NO_ACTION" | "WAITING_USER" | "WAITING_PLATFORM" | "WAITING_CONFIRMATION" | "WAITING_NEXT" | "ALL_PRIVATE";
export type PrivateProjectAdminReason = "NO_ACTION" | "WAITING_USER" | "WAITING_PLATFORM" | "WAITING_CONFIRMATION" | "WAITING_NEXT_COMPLETED" | "WAITING_NEXT_CANCELLED" | "PRIVATE_PROJECT";

export const PRIVATE_PROJECT_ADMIN_REASON_LABELS: Record<PrivateProjectAdminReason, string> = {
  NO_ACTION: "待设置第一步",
  WAITING_USER: "等待用户完成",
  WAITING_PLATFORM: "平台需要处理",
  WAITING_CONFIRMATION: "等待平台确认",
  WAITING_NEXT_COMPLETED: "待安排下一步",
  WAITING_NEXT_CANCELLED: "推进安排已取消，待重新安排",
  PRIVATE_PROJECT: "私人项目"
};

export const PRIVATE_PROJECT_ADMIN_REASON_PRIORITY: Record<PrivateProjectAdminReason, number> = {
  WAITING_CONFIRMATION: 10,
  WAITING_PLATFORM: 20,
  NO_ACTION: 30,
  WAITING_NEXT_COMPLETED: 40,
  WAITING_NEXT_CANCELLED: 45,
  WAITING_USER: 80,
  PRIVATE_PROJECT: 90
};

const unsafeTextPattern = /<[^>]+>|<\/?script|javascript:|data:/i;
const placeholderPattern = /^(test|demo|asdf|qwer|placeholder|测试|占位|样例)$/i;

function isActiveAdmin(user: Viewer | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

function isActiveUser(user: Viewer | null | undefined) {
  return Boolean(user && user.status === UserStatus.ACTIVE);
}

function normalizePlainText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function plainText(label: string, min: number, max: number, options: { allowEmpty?: boolean; rejectPlaceholder?: boolean } = {}) {
  return z
    .preprocess(normalizePlainText, z.string())
    .superRefine((value, ctx) => {
      if (!options.allowEmpty || value.length > 0) {
        if (value.length < min) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}至少 ${min} 个字。` });
        }
      }
      if (value.length > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}不能超过 ${max} 个字。` });
      }
      if (value && unsafeTextPattern.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}只能填写纯文本。` });
      }
      if (options.rejectPlaceholder && placeholderPattern.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}不能使用测试占位内容。` });
      }
    });
}

const optionalDateInput = z
  .preprocess((value) => (typeof value === "string" && value.trim() ? value.trim() : null), z.string().nullable())
  .superRefine((value, ctx) => {
    if (value && Number.isNaN(new Date(value).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "日期格式不正确。" });
    }
  })
  .transform((value) => (value ? new Date(value) : null));

const optionalExpectedDateInput = optionalDateInput;

export const privateProjectActionCreateSchema = z
  .object({
    type: z.nativeEnum(CollaborationProjectActionType),
    responsibility: z.nativeEnum(CollaborationProjectActionResponsibility),
    title: plainText("标题", 2, 40, { rejectPlaceholder: true }),
    instructions: plainText("具体说明", 5, 1000),
    dueAt: optionalDateInput.optional(),
    expectedProjectUpdatedAt: optionalExpectedDateInput.optional()
  })
  .strict();

export const privateProjectActionSubmitSchema = z
  .object({
    completionNote: plainText("完成说明", 0, 1000, { allowEmpty: true }).optional(),
    expectedUpdatedAt: optionalExpectedDateInput.optional()
  })
  .strict();

export const privateProjectActionCompleteSchema = z
  .object({
    completionNote: plainText("完成说明", 0, 1000, { allowEmpty: true }).optional(),
    expectedUpdatedAt: optionalExpectedDateInput.optional()
  })
  .strict();

export const privateProjectActionCancelSchema = z
  .object({
    reason: plainText("取消原因", 10, 200),
    expectedUpdatedAt: optionalExpectedDateInput.optional()
  })
  .strict();

export function parsePrivateProjectActionCreateInput(input: unknown) {
  return privateProjectActionCreateSchema.safeParse(input);
}

export function parsePrivateProjectActionSubmitInput(input: unknown) {
  return privateProjectActionSubmitSchema.safeParse(input);
}

export function parsePrivateProjectActionCompleteInput(input: unknown) {
  return privateProjectActionCompleteSchema.safeParse(input);
}

export function parsePrivateProjectActionCancelInput(input: unknown) {
  return privateProjectActionCancelSchema.safeParse(input);
}

export function privateProjectHref(projectId: string) {
  return `/me/projects/collaboration/${projectId}`;
}

export function derivePrivateProjectStage(action?: Pick<PrivateProjectAction, "type" | "status"> | null): PrivateProjectStage {
  if (!action) return "PROJECT_SETUP";
  if (action.type === CollaborationProjectActionType.DESIGN_CLARIFICATION) return "DESIGN_DIRECTION";
  if (action.type === CollaborationProjectActionType.FABRIC_BRIEF) return "FABRIC_PREPARATION";
  if (action.type === CollaborationProjectActionType.SAMPLE_BRIEF) return "SAMPLE_PREPARATION";
  if (action.type === CollaborationProjectActionType.PRODUCTION_FEASIBILITY) return "PRODUCTION_PREPARATION";
  return "PROJECT_SETUP";
}

export function isOpenPrivateProjectAction(action?: Pick<PrivateProjectAction, "status"> | null) {
  return Boolean(action && OPEN_PRIVATE_PROJECT_ACTION_STATUSES.includes(action.status as (typeof OPEN_PRIVATE_PROJECT_ACTION_STATUSES)[number]));
}

export function getCurrentPrivateProjectAction<T extends Pick<PrivateProjectAction, "status">>(actions: T[]) {
  return actions.find(isOpenPrivateProjectAction) ?? null;
}

export function privateProjectAdminReason(
  actions: Array<Pick<PrivateProjectActionListItem, "status" | "responsibility" | "updatedAt">>
): PrivateProjectAdminReason {
  const currentAction = getCurrentPrivateProjectAction(actions);
  if (!currentAction) {
    const latestAction = actions[0];
    if (!latestAction) return "NO_ACTION";
    return latestAction.status === CollaborationProjectActionStatus.CANCELLED ? "WAITING_NEXT_CANCELLED" : "WAITING_NEXT_COMPLETED";
  }
  if (currentAction.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION) return "WAITING_CONFIRMATION";
  if (currentAction.responsibility === CollaborationProjectActionResponsibility.PLATFORM) return "WAITING_PLATFORM";
  return "WAITING_USER";
}

export function privateProjectAdminReasonLabel(actions: Array<Pick<PrivateProjectActionListItem, "status" | "responsibility" | "updatedAt">>) {
  return PRIVATE_PROJECT_ADMIN_REASON_LABELS[privateProjectAdminReason(actions)];
}

export function privateProjectAdminSortPriority(actions: Array<Pick<PrivateProjectActionListItem, "status" | "responsibility" | "updatedAt">>) {
  return PRIVATE_PROJECT_ADMIN_REASON_PRIORITY[privateProjectAdminReason(actions)];
}

export function privateProjectActionSummary(action?: Pick<PrivateProjectAction, "status" | "title" | "responsibility" | "type"> | null) {
  if (!action) {
    return {
      title: "等待平台安排第一步",
      statusLabel: "待安排",
      responsibilityLabel: "平台正在处理",
      stage: "PROJECT_SETUP" as PrivateProjectStage,
      stageLabel: PRIVATE_PROJECT_STAGE_LABELS.PROJECT_SETUP
    };
  }
  const stage = derivePrivateProjectStage(action);
  return {
    title: action.title,
    statusLabel: PRIVATE_PROJECT_ACTION_STATUS_LABELS[action.status],
    responsibilityLabel: PRIVATE_PROJECT_ACTION_RESPONSIBILITY_LABELS[action.responsibility],
    stage,
    stageLabel: PRIVATE_PROJECT_STAGE_LABELS[stage]
  };
}

function sameTime(a?: Date | null, b?: Date | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function sameActionInput(action: PrivateProjectAction, input: z.infer<typeof privateProjectActionCreateSchema>) {
  return (
    action.type === input.type &&
    action.responsibility === input.responsibility &&
    action.title === input.title &&
    action.instructions === input.instructions &&
    sameTime(action.dueAt, input.dueAt ?? null)
  );
}

function conflictMessage() {
  return "项目状态已更新，请刷新后重试。";
}

function isRetryableActionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034");
}

function expectedMatches(updatedAt: Date, expected?: Date | null) {
  return !expected || updatedAt.getTime() === expected.getTime();
}

async function createPrivateProjectNotification(tx: Transaction, input: { ownerId?: string | null; title: string; content: string; projectId: string }) {
  if (!input.ownerId) return null;
  const title = safeNotificationSummary(input.title, 120);
  const content = safeNotificationSummary(input.content, 240);
  const linkUrl = sanitizeNotificationTargetUrl(privateProjectHref(input.projectId));

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

async function createProjectEventOnce(tx: Transaction, input: { projectId: string; actionId?: string | null; actorId?: string | null; eventType: CollaborationProjectEventType; note?: string | null }) {
  const duplicate = await tx.collaborationProjectEvent.findFirst({
    where: {
      projectId: input.projectId,
      actionId: input.actionId ?? null,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
    },
    select: { id: true }
  });
  if (duplicate) return duplicate;

  return tx.collaborationProjectEvent.create({
    data: {
      projectId: input.projectId,
      actionId: input.actionId ?? null,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      note: input.note ? safeNotificationSummary(input.note, 240) : null
    }
  });
}

export async function createProjectCreatedEventForConversion(tx: Transaction, input: { projectId: string; actorId?: string | null }) {
  return createProjectEventOnce(tx, {
    projectId: input.projectId,
    actorId: input.actorId ?? null,
    eventType: CollaborationProjectEventType.PROJECT_CREATED,
    note: "正式项目已建立"
  });
}

function projectEligibilityWhere(projectId: string): Prisma.CollaborationProjectWhereInput {
  return {
    id: projectId,
    visibility: CollaborationProjectVisibility.PRIVATE,
    status: CollaborationProjectStatus.DRAFT
  };
}

function adminPrivateProjectBaseWhere(): Prisma.CollaborationProjectWhereInput {
  return {
    visibility: CollaborationProjectVisibility.PRIVATE,
    status: CollaborationProjectStatus.DRAFT,
    ownerUserId: { not: null }
  };
}

function activeUserActionWhere(): Prisma.CollaborationProjectActionWhereInput {
  return {
    status: CollaborationProjectActionStatus.ACTIVE,
    responsibility: CollaborationProjectActionResponsibility.USER
  };
}

function activePlatformActionWhere(): Prisma.CollaborationProjectActionWhereInput {
  return {
    status: CollaborationProjectActionStatus.ACTIVE,
    responsibility: CollaborationProjectActionResponsibility.PLATFORM
  };
}

function waitingConfirmationActionWhere(): Prisma.CollaborationProjectActionWhereInput {
  return {
    status: CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION,
    responsibility: CollaborationProjectActionResponsibility.USER
  };
}

function openPrivateProjectActionWhere(): Prisma.CollaborationProjectActionWhereInput {
  return { status: { in: [...OPEN_PRIVATE_PROJECT_ACTION_STATUSES] } };
}

function endedPrivateProjectActionWhere(): Prisma.CollaborationProjectActionWhereInput {
  return { status: { in: [CollaborationProjectActionStatus.COMPLETED, CollaborationProjectActionStatus.CANCELLED] } };
}

export function getAdminPrivateProjectWhere(filter: PrivateProjectAdminFilter): Prisma.CollaborationProjectWhereInput {
  const baseWhere = adminPrivateProjectBaseWhere();
  if (filter === "NO_ACTION") {
    return { ...baseWhere, actions: { none: {} } };
  }
  if (filter === "WAITING_USER") {
    return { ...baseWhere, actions: { some: activeUserActionWhere() } };
  }
  if (filter === "WAITING_PLATFORM") {
    return { ...baseWhere, actions: { some: activePlatformActionWhere() } };
  }
  if (filter === "WAITING_CONFIRMATION") {
    return { ...baseWhere, actions: { some: waitingConfirmationActionWhere() } };
  }
  if (filter === "WAITING_NEXT") {
    return {
      ...baseWhere,
      AND: [{ actions: { none: openPrivateProjectActionWhere() } }, { actions: { some: endedPrivateProjectActionWhere() } }]
    };
  }
  if (filter === "ALL_PRIVATE") return baseWhere;
  return {
    ...baseWhere,
    OR: [
      { actions: { some: waitingConfirmationActionWhere() } },
      { actions: { some: activePlatformActionWhere() } },
      { actions: { none: {} } },
      {
        AND: [{ actions: { none: openPrivateProjectActionWhere() } }, { actions: { some: endedPrivateProjectActionWhere() } }]
      }
    ]
  };
}

export async function getAdminPrivateProjects({
  filter = "TODO",
  page = 1,
  pageSize = 20
}: {
  filter?: PrivateProjectAdminFilter;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(Math.max(1, Math.floor(pageSize)), 50);
  const where = getAdminPrivateProjectWhere(filter);
  const select = {
    id: true,
    title: true,
    status: true,
    visibility: true,
    ownerUserId: true,
    createdAt: true,
    updatedAt: true,
    ownerUser: {
      select: {
        id: true,
        nickname: true,
        createdAt: true
      }
    },
    projectIntake: {
      select: {
        id: true,
        projectTitle: true,
        category: true,
        primaryNeed: true,
        convertedAt: true
      }
    },
    actions: {
      select: privateProjectActionListSelect,
      orderBy: { updatedAt: "desc" as const },
      take: 2
    }
  } satisfies Prisma.CollaborationProjectSelect;

  if (filter === "TODO") {
    const buckets = [
      getAdminPrivateProjectWhere("WAITING_CONFIRMATION"),
      getAdminPrivateProjectWhere("WAITING_PLATFORM"),
      getAdminPrivateProjectWhere("NO_ACTION"),
      getAdminPrivateProjectWhere("WAITING_NEXT")
    ];
    const counts = await Promise.all(buckets.map((bucketWhere) => prisma.collaborationProject.count({ where: bucketWhere })));
    const total = counts.reduce((sum, count) => sum + count, 0);
    const items: Array<Prisma.CollaborationProjectGetPayload<{ select: typeof select }>> = [];
    let remainingSkip = (safePage - 1) * safePageSize;
    let remainingTake = safePageSize;

    for (const [index, bucketWhere] of buckets.entries()) {
      if (remainingTake <= 0) break;
      const bucketCount = counts[index] ?? 0;
      if (remainingSkip >= bucketCount) {
        remainingSkip -= bucketCount;
        continue;
      }
      const bucketItems = await prisma.collaborationProject.findMany({
        where: bucketWhere,
        select,
        orderBy: { updatedAt: "desc" },
        skip: remainingSkip,
        take: remainingTake
      });
      items.push(...bucketItems);
      remainingTake -= bucketItems.length;
      remainingSkip = 0;
    }

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      pageCount: Math.max(1, Math.ceil(total / safePageSize))
    };
  }

  const [items, total] = await Promise.all([
    prisma.collaborationProject.findMany({
      where,
      select,
      orderBy: { updatedAt: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize
    }),
    prisma.collaborationProject.count({ where })
  ]);

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    pageCount: Math.max(1, Math.ceil(total / safePageSize))
  };
}

export async function getAdminPrivateProjectDetail(id: string, admin: Viewer) {
  if (!isActiveAdmin(admin)) return null;
  return prisma.collaborationProject.findFirst({
    where: projectEligibilityWhere(id),
    select: {
      id: true,
      title: true,
      status: true,
      visibility: true,
      ownerUserId: true,
      description: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
      ownerUser: {
        select: {
          id: true,
          nickname: true,
          persona: true,
          createdAt: true
        }
      },
      projectIntake: {
        select: {
          id: true,
          projectTitle: true,
          ideaText: true,
          category: true,
          categoryOther: true,
          primaryNeed: true,
          targetAudience: true,
          reviewNote: true,
          convertedAt: true,
          createdAt: true
        }
      },
      actions: {
        select: privateProjectActionSelect,
        orderBy: { updatedAt: "desc" },
        take: 50
      },
      events: {
        select: privateProjectEventSelect,
        orderBy: { createdAt: "desc" },
        take: 80
      }
    }
  });
}

export async function createPrivateProjectAction(projectId: string, admin: Viewer, rawInput: unknown) {
  if (!isActiveAdmin(admin)) return { ok: false as const, status: 403, error: "没有后台权限。" };
  const parsed = parsePrivateProjectActionCreateInput(rawInput);
  if (!parsed.success) return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "请检查下一步信息。" };

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const project = await tx.collaborationProject.findFirst({
            where: projectEligibilityWhere(projectId),
            select: {
              id: true,
              title: true,
              status: true,
              visibility: true,
              ownerUserId: true,
              updatedAt: true,
              actions: {
                where: { status: { in: [...OPEN_PRIVATE_PROJECT_ACTION_STATUSES] } },
                select: privateProjectActionSelect,
                orderBy: { updatedAt: "desc" },
                take: 1
              }
            }
          });

          if (!project) return { ok: false as const, status: 404, error: "项目不存在或暂不可处理。" };
          if (!project.ownerUserId) return { ok: false as const, status: 409, error: "项目缺少负责人，暂不能设置下一步。" };
          if (!expectedMatches(project.updatedAt, parsed.data.expectedProjectUpdatedAt ?? null)) {
            return { ok: false as const, status: 409, error: conflictMessage() };
          }

          const existing = project.actions[0];
          if (existing) {
            if (sameActionInput(existing, parsed.data)) return { ok: true as const, action: existing, idempotent: true };
            return { ok: false as const, status: 409, error: "当前项目已经有未完成的下一步，请先完成或取消。" };
          }

          const action = await tx.collaborationProjectAction.create({
            data: {
              projectId,
              type: parsed.data.type,
              responsibility: parsed.data.responsibility,
              title: parsed.data.title,
              instructions: parsed.data.instructions,
              dueAt: parsed.data.dueAt ?? null,
              createdById: admin.id
            },
            select: privateProjectActionSelect
          });

          await createProjectEventOnce(tx, {
            projectId,
            actionId: action.id,
            actorId: admin.id,
            eventType: CollaborationProjectEventType.ACTION_CREATED,
            note: action.title
          });

          await tx.adminLog.create({
            data: {
              adminId: admin.id,
              action: "COLLABORATION_PROJECT_ACTION_CREATE",
              targetType: "CollaborationProjectAction",
              targetId: action.id,
              detail: {
                projectId,
                type: action.type,
                responsibility: action.responsibility,
                status: action.status
              }
            }
          });

          await createPrivateProjectNotification(tx, {
            ownerId: project.ownerUserId,
            projectId,
            title: action.responsibility === CollaborationProjectActionResponsibility.USER ? "项目有新的下一步" : "平台正在推进你的项目",
            content: action.responsibility === CollaborationProjectActionResponsibility.USER ? "平台已经为你的项目安排了新的推进事项。" : "平台已经开始处理当前项目步骤。"
          });

          return { ok: true as const, action, idempotent: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (isRetryableActionError(error) && attempt < maxAttempts) continue;
      if (isRetryableActionError(error)) return { ok: false as const, status: 409, error: conflictMessage() };
      console.error("Private project action creation failed", { errorType: error instanceof Error ? error.name : typeof error });
      return { ok: false as const, status: 500, error: "项目下一步创建失败，请稍后再试。" };
    }
  }
  return { ok: false as const, status: 409, error: conflictMessage() };
}

export async function submitPrivateProjectActionResult(projectId: string, actionId: string, user: Viewer, rawInput: unknown) {
  if (!isActiveUser(user)) return { ok: false as const, status: 401, error: "请先登录。" };
  const parsed = parsePrivateProjectActionSubmitInput(rawInput);
  if (!parsed.success) return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "请检查完成说明。" };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const project = await tx.collaborationProject.findFirst({
          where: { ...projectEligibilityWhere(projectId), ownerUserId: user.id },
          select: {
            id: true,
            ownerUserId: true,
            actions: {
              where: { id: actionId },
              select: privateProjectActionSelect,
              take: 1
            }
          }
        });
        const action = project?.actions[0];
        if (!project || !action) return { ok: false as const, status: 404, error: "项目不存在或暂不可处理。" };
        if (action.responsibility !== CollaborationProjectActionResponsibility.USER) return { ok: false as const, status: 403, error: "当前步骤由平台处理。" };
        if (action.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION) return { ok: true as const, action, idempotent: true };
        if (action.status !== CollaborationProjectActionStatus.ACTIVE) return { ok: false as const, status: 409, error: "当前步骤状态已更新。" };
        if (!expectedMatches(action.updatedAt, parsed.data.expectedUpdatedAt ?? null)) return { ok: false as const, status: 409, error: conflictMessage() };

        const updated = await tx.collaborationProjectAction.updateMany({
          where: {
            id: actionId,
            projectId,
            responsibility: CollaborationProjectActionResponsibility.USER,
            status: CollaborationProjectActionStatus.ACTIVE,
            ...(parsed.data.expectedUpdatedAt ? { updatedAt: parsed.data.expectedUpdatedAt } : {})
          },
          data: {
            status: CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION,
            userResultNote: parsed.data.completionNote ?? "",
            userResultSubmittedAt: new Date()
          }
        });
        if (updated.count !== 1) return { ok: false as const, status: 409, error: conflictMessage() };

        await createProjectEventOnce(tx, {
          projectId,
          actionId,
          actorId: user.id,
          eventType: CollaborationProjectEventType.USER_RESULT_SUBMITTED,
          note: "用户提交了完成结果"
        });

        const nextAction = await tx.collaborationProjectAction.findUniqueOrThrow({
          where: { id: actionId },
          select: privateProjectActionSelect
        });
        return { ok: true as const, action: nextAction, idempotent: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isRetryableActionError(error)) return { ok: false as const, status: 409, error: conflictMessage() };
    console.error("Private project user action submit failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { ok: false as const, status: 500, error: "完成结果提交失败，请稍后再试。" };
  }
}

export async function completePrivateProjectAction(projectId: string, actionId: string, admin: Viewer, rawInput: unknown) {
  if (!isActiveAdmin(admin)) return { ok: false as const, status: 403, error: "没有后台权限。" };
  const parsed = parsePrivateProjectActionCompleteInput(rawInput);
  if (!parsed.success) return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "请检查完成说明。" };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const project = await tx.collaborationProject.findFirst({
          where: projectEligibilityWhere(projectId),
          select: {
            id: true,
            ownerUserId: true,
            actions: {
              where: { id: actionId },
              select: privateProjectActionSelect,
              take: 1
            }
          }
        });
        const action = project?.actions[0];
        if (!project || !action) return { ok: false as const, status: 404, error: "项目不存在或暂不可处理。" };
        if (action.status === CollaborationProjectActionStatus.COMPLETED) return { ok: true as const, action, idempotent: true };
        if (action.status === CollaborationProjectActionStatus.CANCELLED) return { ok: false as const, status: 409, error: "已取消的步骤不能完成。" };
        if (!expectedMatches(action.updatedAt, parsed.data.expectedUpdatedAt ?? null)) return { ok: false as const, status: 409, error: conflictMessage() };

        const canCompleteUserAction = action.responsibility === CollaborationProjectActionResponsibility.USER && action.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION;
        const canCompletePlatformAction = action.responsibility === CollaborationProjectActionResponsibility.PLATFORM && action.status === CollaborationProjectActionStatus.ACTIVE;
        if (!canCompleteUserAction && !canCompletePlatformAction) return { ok: false as const, status: 409, error: "当前步骤还不能确认完成。" };

        const updated = await tx.collaborationProjectAction.updateMany({
          where: {
            id: actionId,
            projectId,
            status: action.status,
            ...(parsed.data.expectedUpdatedAt ? { updatedAt: parsed.data.expectedUpdatedAt } : {})
          },
          data: {
            status: CollaborationProjectActionStatus.COMPLETED,
            completedAt: new Date(),
            completedById: admin.id,
            completionNote: parsed.data.completionNote ?? ""
          }
        });
        if (updated.count !== 1) return { ok: false as const, status: 409, error: conflictMessage() };

        await createProjectEventOnce(tx, {
          projectId,
          actionId,
          actorId: admin.id,
          eventType: CollaborationProjectEventType.ACTION_COMPLETED,
          note: "当前项目步骤已完成"
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "COLLABORATION_PROJECT_ACTION_COMPLETE",
            targetType: "CollaborationProjectAction",
            targetId: actionId,
            detail: {
              projectId,
              oldStatus: action.status,
              newStatus: CollaborationProjectActionStatus.COMPLETED
            }
          }
        });

        await createPrivateProjectNotification(tx, {
          ownerId: project.ownerUserId,
          projectId,
          title: "当前项目步骤已完成",
          content: "平台已经确认当前步骤完成，后续安排会继续显示在项目工作台。"
        });

        const nextAction = await tx.collaborationProjectAction.findUniqueOrThrow({
          where: { id: actionId },
          select: privateProjectActionSelect
        });
        return { ok: true as const, action: nextAction, idempotent: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isRetryableActionError(error)) return { ok: false as const, status: 409, error: conflictMessage() };
    console.error("Private project action completion failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { ok: false as const, status: 500, error: "项目步骤确认失败，请稍后再试。" };
  }
}

export async function cancelPrivateProjectAction(projectId: string, actionId: string, admin: Viewer, rawInput: unknown) {
  if (!isActiveAdmin(admin)) return { ok: false as const, status: 403, error: "没有后台权限。" };
  const parsed = parsePrivateProjectActionCancelInput(rawInput);
  if (!parsed.success) return { ok: false as const, status: 400, error: parsed.error.issues[0]?.message ?? "请填写取消原因。" };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const project = await tx.collaborationProject.findFirst({
          where: projectEligibilityWhere(projectId),
          select: {
            id: true,
            ownerUserId: true,
            actions: {
              where: { id: actionId },
              select: privateProjectActionSelect,
              take: 1
            }
          }
        });
        const action = project?.actions[0];
        if (!project || !action) return { ok: false as const, status: 404, error: "项目不存在或暂不可处理。" };
        if (action.status === CollaborationProjectActionStatus.CANCELLED) return { ok: true as const, action, idempotent: true };
        if (action.status === CollaborationProjectActionStatus.COMPLETED) return { ok: false as const, status: 409, error: "已完成的步骤不能取消。" };
        if (!isOpenPrivateProjectAction(action)) return { ok: false as const, status: 409, error: "当前步骤状态已更新。" };
        if (!expectedMatches(action.updatedAt, parsed.data.expectedUpdatedAt ?? null)) return { ok: false as const, status: 409, error: conflictMessage() };

        const updated = await tx.collaborationProjectAction.updateMany({
          where: {
            id: actionId,
            projectId,
            status: action.status,
            ...(parsed.data.expectedUpdatedAt ? { updatedAt: parsed.data.expectedUpdatedAt } : {})
          },
          data: {
            status: CollaborationProjectActionStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledById: admin.id,
            cancellationReason: parsed.data.reason
          }
        });
        if (updated.count !== 1) return { ok: false as const, status: 409, error: conflictMessage() };

        await createProjectEventOnce(tx, {
          projectId,
          actionId,
          actorId: admin.id,
          eventType: CollaborationProjectEventType.ACTION_CANCELLED,
          note: "平台调整了当前推进安排"
        });

        await tx.adminLog.create({
          data: {
            adminId: admin.id,
            action: "COLLABORATION_PROJECT_ACTION_CANCEL",
            targetType: "CollaborationProjectAction",
            targetId: actionId,
            detail: {
              projectId,
              oldStatus: action.status,
              newStatus: CollaborationProjectActionStatus.CANCELLED
            }
          }
        });

        await createPrivateProjectNotification(tx, {
          ownerId: project.ownerUserId,
          projectId,
          title: "项目下一步已更新",
          content: "平台调整了当前推进安排，请进入项目工作台查看。"
        });

        const nextAction = await tx.collaborationProjectAction.findUniqueOrThrow({
          where: { id: actionId },
          select: privateProjectActionSelect
        });
        return { ok: true as const, action: nextAction, idempotent: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isRetryableActionError(error)) return { ok: false as const, status: 409, error: conflictMessage() };
    console.error("Private project action cancellation failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { ok: false as const, status: 500, error: "项目步骤取消失败，请稍后再试。" };
  }
}
