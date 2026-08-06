import {
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionStatus,
  CollaborationProjectVisibility,
  UserRole,
  UserStatus,
  type User
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PRIVATE_PROJECT_ACTION_RESPONSIBILITY_LABELS,
  PRIVATE_PROJECT_ACTION_STATUS_LABELS,
  PRIVATE_PROJECT_EVENT_LABELS,
  getCurrentPrivateProjectAction,
  privateProjectActionSelect,
  privateProjectActionSummary,
  privateProjectEventSelect
} from "@/lib/private-project-actions";
import { PROJECT_INTAKE_EVENT_LABELS, categoryLabel, needLabel, projectIntakeTitle, sourceLabel } from "@/lib/start-projects";

type Viewer = Pick<User, "id" | "role" | "status">;

export const privateCollaborationProjectSelect = {
  id: true,
  title: true,
  status: true,
  visibility: true,
  summary: true,
  description: true,
  ownerUserId: true,
  workId: true,
  createdAt: true,
  updatedAt: true,
  projectIntake: {
    select: {
      id: true,
      ownerId: true,
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
      reviewNote: true,
      status: true,
      convertedAt: true,
      createdAt: true,
      updatedAt: true,
      events: {
        select: {
          id: true,
          eventType: true,
          note: true,
          createdAt: true,
          actor: {
            select: {
              nickname: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: "desc" as const },
        take: 40
      }
    }
  },
  actions: {
    select: privateProjectActionSelect,
    orderBy: { updatedAt: "desc" as const },
    take: 50
  },
  events: {
    select: privateProjectEventSelect,
    orderBy: { createdAt: "desc" as const },
    take: 80
  }
};

export type PrivateCollaborationProject = NonNullable<Awaited<ReturnType<typeof getPrivateCollaborationProjectForViewer>>>;

function isActiveAdmin(user: Viewer | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

function canViewPrivateProject(user: Viewer | null | undefined, project: { ownerUserId: string | null; projectIntake?: { ownerId: string } | null }) {
  if (!user || user.status !== UserStatus.ACTIVE) return false;
  if (isActiveAdmin(user)) return true;
  return project.ownerUserId === user.id || project.projectIntake?.ownerId === user.id;
}

export async function getPrivateCollaborationProjectsForUser(userId: string) {
  const projects = await prisma.collaborationProject.findMany({
    where: {
      ownerUserId: userId,
      visibility: CollaborationProjectVisibility.PRIVATE,
      projectIntake: { isNot: null }
    },
    select: privateCollaborationProjectSelect,
    orderBy: { updatedAt: "desc" },
    take: 40
  });
  return projects;
}

export async function getPrivateCollaborationProjectForViewer(id: string, user: Viewer) {
  const project = await prisma.collaborationProject.findUnique({
    where: { id },
    select: privateCollaborationProjectSelect
  });
  if (!project || !canViewPrivateProject(user, project)) return null;
  return project;
}

export function privateProjectCurrentAction(project: Pick<PrivateCollaborationProject, "actions">) {
  return getCurrentPrivateProjectAction(project.actions);
}

export function privateProjectStageLabel(project: Pick<PrivateCollaborationProject, "actions">) {
  return privateProjectActionSummary(privateProjectCurrentAction(project)).stageLabel;
}

export function privateProjectNextAction(project?: Pick<PrivateCollaborationProject, "actions"> | null) {
  const action = project ? privateProjectCurrentAction(project) : null;
  if (!action) {
    return {
      label: "等待平台安排下一步",
      description: "正式项目已建立，平台会按一个明确步骤继续推进。"
    };
  }

  if (action.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION) {
    return {
      label: "等待平台确认",
      description: "你已经提交了当前步骤结果，平台确认后会安排下一步。"
    };
  }

  if (action.responsibility === CollaborationProjectActionResponsibility.USER) {
    return {
      label: "提交完成结果",
      description: action.instructions
    };
  }

  return {
    label: "平台正在处理",
    description: action.instructions
  };
}

export function privateProjectIntakeSummary(project: PrivateCollaborationProject) {
  const intake = project.projectIntake;
  if (!intake) return "原始启动记录暂不可用。";
  return [
    projectIntakeTitle(intake),
    sourceLabel(intake.sourceType),
    categoryLabel(intake.category, intake.categoryOther),
    needLabel(intake.primaryNeed)
  ]
    .filter(Boolean)
    .join(" / ");
}

export function privateProjectTimeline(project: PrivateCollaborationProject) {
  const intakeEvents = project.projectIntake?.events ?? [];
  const projectEvents = project.events ?? [];
  const convertedAt = project.projectIntake?.convertedAt ?? project.createdAt;
  const convertedEvent = {
    id: `project-${project.id}-converted`,
    title: "正式项目已建立",
    description: "项目已进入正式项目工作台，后续安排仍由平台受控推进。",
    at: convertedAt
  };
  return [
    convertedEvent,
    ...projectEvents.map((event) => ({
      id: event.id,
      title: PRIVATE_PROJECT_EVENT_LABELS[event.eventType],
      description: event.note ?? event.action?.title ?? "",
      at: event.createdAt
    })),
    ...project.actions.map((action) => {
      const statusLabel = PRIVATE_PROJECT_ACTION_STATUS_LABELS[action.status];
      const responsibilityLabel = PRIVATE_PROJECT_ACTION_RESPONSIBILITY_LABELS[action.responsibility];
      return {
        id: `action-${action.id}`,
        title: `${statusLabel}：${action.title}`,
        description: `${responsibilityLabel} / ${action.instructions}`,
        at: action.updatedAt
      };
    }),
    ...intakeEvents.map((event) => ({
      id: event.id,
      title: PROJECT_INTAKE_EVENT_LABELS[event.eventType],
      description: event.note ?? "",
      at: event.createdAt
    }))
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}
