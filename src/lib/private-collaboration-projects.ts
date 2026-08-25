import {
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionStatus,
  CollaborationProjectActionType,
  CollaborationProjectVisibility,
  UserRole,
  UserStatus,
  type User
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
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
  designerId: true,
  workId: true,
  providerId: true,
  provider: {
    select: {
      id: true,
      name: true,
      ownerId: true
    }
  },
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
  },
  providerWorkProposals: {
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      description: true,
      estimatedPrice: true,
      estimatedTime: true,
      moq: true,
      priceMin: true,
      priceMax: true,
      leadTimeDays: true,
      minimumQuantity: true,
      validUntil: true,
      status: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { updatedAt: "desc" as const },
    take: 20
  },
  milestones: {
    select: {
      id: true,
      title: true,
      stage: true,
      status: true,
      dueAt: true,
      completedAt: true,
      note: true,
      visibility: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [
      { dueAt: "asc" as const },
      { createdAt: "asc" as const }
    ],
    take: 30
  },
  orders: {
    where: { preorderCampaignId: null },
    select: {
      id: true,
      title: true,
      quantity: true,
      quantityNote: true,
      amountNote: true,
      deliveryNote: true,
      totalAmount: true,
      currency: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      trackingCompany: true,
      trackingNumber: true,
      confirmedAt: true,
      createdAt: true,
      updatedAt: true,
      paymentAttempts: {
        select: {
          id: true,
          providerAttemptId: true,
          amount: true,
          currency: true,
          status: true,
          capturedAt: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" as const },
        take: 10
      }
    },
    orderBy: { createdAt: "desc" as const },
    take: 5
  },
  negotiationMessages: {
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      sender: {
        select: { nickname: true }
      }
    },
    orderBy: { createdAt: "asc" as const },
    take: 200
  }
};

export type PrivateCollaborationProject = NonNullable<Awaited<ReturnType<typeof getPrivateCollaborationProjectForViewer>>>;

function isActiveAdmin(user: Viewer | null | undefined) {
  return Boolean(user && user.role === UserRole.ADMIN && user.status === UserStatus.ACTIVE);
}

function canViewPrivateProject(user: Viewer | null | undefined, project: {
  ownerUserId: string | null;
  designerId: string | null;
  provider?: { ownerId: string | null } | null;
  projectIntake?: { ownerId: string } | null;
}) {
  if (!user || user.status !== UserStatus.ACTIVE) return false;
  if (isActiveAdmin(user)) return true;
  return project.ownerUserId === user.id
    || project.designerId === user.id
    || project.provider?.ownerId === user.id
    || project.projectIntake?.ownerId === user.id;
}

export async function getPrivateCollaborationProjectsForUser(userId: string) {
  const projects = await prisma.collaborationProject.findMany({
    where: {
      visibility: CollaborationProjectVisibility.PRIVATE,
      OR: [
        { ownerUserId: userId },
        { designerId: userId },
        { provider: { ownerId: userId } }
      ]
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

export function getProjectExperienceStage(project: Pick<PrivateCollaborationProject, "actions">) {
  const action = privateProjectCurrentAction(project);
  const stage =
    !action || action.type === CollaborationProjectActionType.DESIGN_CLARIFICATION
      ? "IDEA"
      : "DEVELOPMENT";

  if (!action) {
    return {
      stage,
      headline: "正在准备下一步",
      description: "我们会根据当前进度继续推进。",
      actor: "platform",
      primaryActionLabel: "继续"
    } as const;
  }

  if (action.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION) {
    return {
      stage,
      headline: "已收到",
      description: "我们正在确认你提交的信息，你现在不用做任何事。",
      actor: "platform",
      primaryActionLabel: "继续"
    } as const;
  }

  if (action.responsibility === CollaborationProjectActionResponsibility.PLATFORM) {
    return {
      stage,
      headline: "我们正在处理",
      description: "我们正在根据你的需求整理下一步。",
      actor: "platform",
      primaryActionLabel: "继续"
    } as const;
  }

  return {
    stage,
    headline: "现在要做",
    description: action.instructions,
    actor: "owner",
    primaryActionLabel: "继续"
  } as const;
}

export function privateProjectNextAction(project?: Pick<PrivateCollaborationProject, "actions"> | null) {
  const action = project ? privateProjectCurrentAction(project) : null;
  if (!action) {
    return {
      label: "继续",
      description: "正在准备下一步。我们会根据当前进度继续推进。"
    };
  }

  if (action.status === CollaborationProjectActionStatus.WAITING_PLATFORM_CONFIRMATION) {
    return {
      label: "继续",
      description: "已收到。我们正在确认你提交的信息，你现在不用做任何事。"
    };
  }

  if (action.responsibility === CollaborationProjectActionResponsibility.USER) {
    return {
      label: "继续",
      description: action.instructions
    };
  }

  return {
    label: "继续",
    description: "我们正在根据你的需求整理下一步。"
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
    title: "项目已启动",
    description: "你可以从当前这一步继续推进。",
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
      return {
        id: `action-${action.id}`,
        title: `${statusLabel}：${action.title}`,
        description: action.instructions,
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
