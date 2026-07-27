import {
  CollaborationProjectStatus,
  ContentStatus,
  IncubationApplicationStatus,
  IncubationStatus,
  ProviderWorkProposalStatus,
  ProviderWorkProposalType,
  RecommendationStatus,
  RequestStatus,
  ReviewStatus,
  WorkIncubationStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PROJECT_WORKBENCH_STAGES = [
  "WORK_PUBLISHED",
  "INCUBATION_CANDIDATE",
  "INCUBATION_CONFIRMED",
  "FABRIC_REQUIREMENT",
  "FABRIC_MATCHING",
  "FABRIC_SELECTED",
  "SAMPLE_REQUESTED",
  "PROPOSAL_RECEIVED",
  "COOPERATION_CONFIRMED",
  "SAMPLE_IN_PROGRESS",
  "SAMPLE_REVIEW",
  "MARKET_VALIDATION",
  "COMPLETED",
  "CANCELLED"
] as const;

export type ProjectWorkbenchStage = (typeof PROJECT_WORKBENCH_STAGES)[number];

export const PROJECT_WORKBENCH_STAGE_LABELS: Record<ProjectWorkbenchStage, string> = {
  WORK_PUBLISHED: "作品已发布",
  INCUBATION_CANDIDATE: "孵化候选",
  INCUBATION_CONFIRMED: "确认孵化",
  FABRIC_REQUIREMENT: "面料需求",
  FABRIC_MATCHING: "面料匹配",
  FABRIC_SELECTED: "面料已选",
  SAMPLE_REQUESTED: "已发起打样",
  PROPOSAL_RECEIVED: "收到方案",
  COOPERATION_CONFIRMED: "确认合作",
  SAMPLE_IN_PROGRESS: "打样推进",
  SAMPLE_REVIEW: "样衣评估",
  MARKET_VALIDATION: "市场验证",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "待处理",
  CONTACTED: "已联系",
  EVALUATED: "评估中",
  QUOTED: "已报价/已回复",
  CLOSED: "已关闭",
  COMPLETED: "已完成"
};

export const APPLICATION_STATUS_LABELS: Record<IncubationApplicationStatus, string> = {
  CANDIDATE: "候选",
  REVIEWING: "审核中",
  NOT_SUITABLE: "暂不适合",
  ACCEPTED: "已接受"
};

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  PENDING: "待查看",
  ACCEPTED: "已采纳",
  REJECTED: "已拒绝",
  INTERESTED: "感兴趣",
  NOT_SUITABLE: "不适合",
  WITHDRAWN: "已撤回"
};

export const PROVIDER_WORK_PROPOSAL_STATUS_LABELS: Record<ProviderWorkProposalStatus, string> = {
  PENDING: "待查看",
  SHORTLISTED: "已备选",
  ACCEPTED: "已采纳",
  REJECTED: "暂不合适"
};

export const PROVIDER_WORK_PROPOSAL_TYPE_LABELS: Record<ProviderWorkProposalType, string> = {
  FABRIC: "面料方案",
  SAMPLE: "打样方案",
  PRODUCTION: "生产方案",
  BUYER_INTENT: "买手反馈",
  OTHER: "供应商方案"
};

const workbenchWorkInclude = {
  images: {
    select: { imageUrl: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1
  },
  incubationApplications: {
    select: { id: true, source: true, status: true, adminNote: true, handledAt: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const }
  },
  incubationProjects: {
    select: { id: true, status: true, platformComment: true, nextAction: true, handledAt: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const }
  },
  workIncubation: {
    select: { status: true, createdAt: true, updatedAt: true }
  },
  fabricRequests: {
    select: { id: true, category: true, desiredFeeling: true, colorDirection: true, budgetRange: true, remark: true, status: true, adminNote: true, handledAt: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const }
  },
  fabricRecommendations: {
    select: {
      id: true,
      status: true,
      reason: true,
      sampleAvailability: true,
      moqText: true,
      responseTime: true,
      createdAt: true,
      updatedAt: true,
      fabric: { select: { id: true, name: true, composition: true, weight: true, width: true, slug: true } },
      provider: { select: { id: true, name: true, slug: true } }
    },
    orderBy: { updatedAt: "desc" as const }
  },
  sampleRequests: {
    select: { id: true, garmentCategory: true, hasPattern: true, hasFabric: true, needsFabricHelp: true, budgetRange: true, quantity: true, expectedDate: true, remark: true, status: true, adminNote: true, handledAt: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const }
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
      status: true,
      createdAt: true,
      updatedAt: true,
      provider: { select: { id: true, name: true, slug: true, type: true } }
    },
    orderBy: { updatedAt: "desc" as const }
  },
  cooperationRequests: {
    select: {
      id: true,
      providerId: true,
      fabricId: true,
      showcaseItemId: true,
      type: true,
      requestType: true,
      quantity: true,
      expectedDate: true,
      message: true,
      budgetRange: true,
      providerResponse: true,
      status: true,
      viewedAt: true,
      respondedAt: true,
      handledAt: true,
      createdAt: true,
      updatedAt: true,
      provider: { select: { id: true, name: true, slug: true, type: true } },
      replies: {
        select: { id: true, senderRole: true, content: true, isRead: true, createdAt: true },
        orderBy: { createdAt: "asc" as const }
      }
    },
    orderBy: { updatedAt: "desc" as const }
  },
  collaborationProjects: {
    select: { id: true, slug: true, title: true, status: true, summary: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" as const }
  }
} satisfies Prisma.WorkInclude;

type WorkbenchWork = Prisma.WorkGetPayload<{ include: typeof workbenchWorkInclude }>;

export type WorkbenchNotification = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: Date;
};

export type ProjectWorkbenchAction = {
  label: string;
  href: string;
  waitingFor: "设计师" | "平台" | "供应商" | "合作双方" | "无";
};

export type ProjectWorkbenchTask = {
  id: string;
  label: string;
  status: string;
  href: string;
  waitingFor: ProjectWorkbenchAction["waitingFor"];
};

export type ProjectWorkbenchTimelineEvent = {
  id: string;
  at: Date;
  title: string;
  description: string;
  kind: string;
};

export type ProjectWorkbenchProject = {
  id: string;
  workId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  stage: ProjectWorkbenchStage;
  stageLabel: string;
  statusLabel: string;
  statusDescription: string;
  nextAction: ProjectWorkbenchAction;
  waitingFor: ProjectWorkbenchAction["waitingFor"];
  pendingCount: number;
  lastUpdatedAt: Date;
  notificationCount: number;
  unreadNotificationCount: number;
  work: WorkbenchWork;
  notifications: WorkbenchNotification[];
  tasks: ProjectWorkbenchTask[];
  timeline: ProjectWorkbenchTimelineEvent[];
};

type StageSignalInput = Pick<WorkbenchWork, "reviewStatus" | "contentStatus" | "wantsIncubation" | "incubationStatus"> & {
  workIncubation?: Pick<NonNullable<WorkbenchWork["workIncubation"]>, "status"> | null;
  incubationApplications: Array<Pick<WorkbenchWork["incubationApplications"][number], "status">>;
  incubationProjects: Array<Pick<WorkbenchWork["incubationProjects"][number], "status">>;
  fabricRequests: Array<Pick<WorkbenchWork["fabricRequests"][number], "status">>;
  fabricRecommendations: Array<Pick<WorkbenchWork["fabricRecommendations"][number], "status">>;
  sampleRequests: Array<Pick<WorkbenchWork["sampleRequests"][number], "status">>;
  providerWorkProposals: Array<Pick<WorkbenchWork["providerWorkProposals"][number], "status" | "type">>;
  cooperationRequests: Array<Pick<WorkbenchWork["cooperationRequests"][number], "status">>;
  collaborationProjects: Array<Pick<WorkbenchWork["collaborationProjects"][number], "status">>;
};

const activeRequestStatuses: RequestStatus[] = [RequestStatus.PENDING, RequestStatus.CONTACTED, RequestStatus.EVALUATED, RequestStatus.QUOTED];
const activeRecommendationStatuses: RecommendationStatus[] = [RecommendationStatus.PENDING, RecommendationStatus.INTERESTED];
const activeProviderProposalStatuses: ProviderWorkProposalStatus[] = [ProviderWorkProposalStatus.PENDING, ProviderWorkProposalStatus.SHORTLISTED];
const activeIncubationApplicationStatuses: IncubationApplicationStatus[] = [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING];

function isActiveRequest(status: RequestStatus) {
  return activeRequestStatuses.includes(status);
}

function hasAcceptedFabricRecommendation(work: StageSignalInput) {
  return work.fabricRecommendations.some((item) => item.status === RecommendationStatus.ACCEPTED);
}

function hasOpenFabricRecommendation(work: StageSignalInput) {
  return work.fabricRecommendations.some((item) => activeRecommendationStatuses.includes(item.status));
}

function hasOpenProviderProposal(work: StageSignalInput) {
  return work.providerWorkProposals.some((item) => activeProviderProposalStatuses.includes(item.status));
}

function hasAcceptedProviderProposal(work: StageSignalInput) {
  return work.providerWorkProposals.some((item) => item.status === ProviderWorkProposalStatus.ACCEPTED);
}

export function calculateProjectWorkbenchStage(work: StageSignalInput): ProjectWorkbenchStage {
  if (
    work.contentStatus === ContentStatus.DELETED ||
    work.contentStatus === ContentStatus.OFFLINE ||
    work.reviewStatus === ReviewStatus.REJECTED ||
    work.reviewStatus === ReviewStatus.OFFLINE ||
    work.collaborationProjects.some((project) => project.status === CollaborationProjectStatus.CANCELLED)
  ) {
    return "CANCELLED";
  }

  if (
    work.incubationProjects.some((project) => project.status === IncubationStatus.COMPLETED) ||
    work.collaborationProjects.some((project) => project.status === CollaborationProjectStatus.COMPLETED)
  ) {
    return "COMPLETED";
  }

  if (work.incubationProjects.some((project) => project.status === IncubationStatus.SAMPLE_EVALUATING || project.status === IncubationStatus.PATTERN_EVALUATING || project.status === IncubationStatus.QUOTE_DISCUSSING)) {
    return "SAMPLE_REVIEW";
  }

  if (work.incubationProjects.some((project) => project.status === IncubationStatus.SAMPLE_MAKING)) {
    return "SAMPLE_IN_PROGRESS";
  }

  if (
    hasAcceptedProviderProposal(work) ||
    work.cooperationRequests.some((request) => request.status === RequestStatus.COMPLETED) ||
    work.workIncubation?.status === WorkIncubationStatus.COLLABORATION_REACHED ||
    work.collaborationProjects.some((project) => project.status !== CollaborationProjectStatus.DRAFT && project.status !== CollaborationProjectStatus.CANCELLED)
  ) {
    return "COOPERATION_CONFIRMED";
  }

  if (hasOpenProviderProposal(work)) return "PROPOSAL_RECEIVED";
  if (work.sampleRequests.some((request) => isActiveRequest(request.status))) return "SAMPLE_REQUESTED";
  if (hasAcceptedFabricRecommendation(work)) return "FABRIC_SELECTED";
  if (hasOpenFabricRecommendation(work) || work.incubationProjects.some((project) => project.status === IncubationStatus.FABRIC_MATCHING) || work.workIncubation?.status === WorkIncubationStatus.FABRIC_MATCHING) return "FABRIC_MATCHING";
  if (work.fabricRequests.some((request) => isActiveRequest(request.status))) return "FABRIC_REQUIREMENT";

  if (work.incubationApplications.some((application) => application.status === IncubationApplicationStatus.ACCEPTED) || work.incubationProjects.length > 0) {
    return "INCUBATION_CONFIRMED";
  }

  if (
    work.wantsIncubation ||
    work.incubationStatus === IncubationStatus.CANDIDATE ||
    work.incubationStatus === IncubationStatus.REVIEWING ||
    work.workIncubation?.status === WorkIncubationStatus.CANDIDATE ||
    work.incubationApplications.some((application) => activeIncubationApplicationStatuses.includes(application.status))
  ) {
    return "INCUBATION_CANDIDATE";
  }

  return "WORK_PUBLISHED";
}

export function redactPrivateContact(value?: string | null) {
  const text = value?.trim();
  if (!text) return "";
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[已隐藏邮箱]")
    .replace(/(?:\+?86[-\s]?)?1[3-9]\d{9}/g, "[已隐藏手机号]")
    .replace(/(?:微信|wechat|weixin|wx|whatsapp)[:：\s]*[A-Za-z0-9_-]{3,}/gi, "联系方式[已隐藏]")
    .replace(/\s+/g, " ")
    .trim();
}

export function shortText(value?: string | null, limit = 88) {
  const text = redactPrivateContact(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function maxDate(dates: Array<Date | null | undefined>) {
  const times = dates.filter(Boolean).map((date) => date!.getTime());
  return new Date(Math.max(...times));
}

function formatParts(parts: Array<string | number | null | undefined | false>) {
  return parts.filter((part) => part !== null && part !== undefined && part !== false && String(part).trim()).join(" / ");
}

function statusDescription(work: WorkbenchWork, stage: ProjectWorkbenchStage) {
  const project = work.incubationProjects[0];
  if (project?.platformComment) return shortText(project.platformComment, 140);
  if (project?.nextAction) return shortText(project.nextAction, 140);
  if (work.reviewStatus !== ReviewStatus.APPROVED && work.reviewStatus !== ReviewStatus.PUBLISHED) return "作品还没有进入稳定公开状态，先确认审核与可见性。";
  if (stage === "WORK_PUBLISHED") return "作品已经建立项目锚点，可以继续补充面料、打样或孵化线索。";
  if (stage === "INCUBATION_CANDIDATE") return "作品已经进入孵化候选或有孵化意向，等待进一步确认。";
  if (stage === "FABRIC_MATCHING") return "已有面料推荐或匹配进展，适合先确认材料方向。";
  if (stage === "PROPOSAL_RECEIVED") return "已有供应商方案，建议优先查看是否可进入打样或合作。";
  if (stage === "COOPERATION_CONFIRMED") return "已有采纳方案、完成询盘或合作项目记录。";
  if (stage === "CANCELLED") return "该项目对应作品或合作记录已经停止推进。";
  return "项目正在基于现有业务记录推进。";
}

function buildNextAction(work: WorkbenchWork, stage: ProjectWorkbenchStage): ProjectWorkbenchAction {
  const project = work.incubationProjects[0];
  if (project?.nextAction) {
    return { label: shortText(project.nextAction, 28) || "查看项目详情", href: `/me/projects/${work.id}`, waitingFor: "设计师" };
  }
  if (stage === "CANCELLED") return { label: "查看作品状态", href: `/works/${work.id}`, waitingFor: "设计师" };
  if (work.reviewStatus !== ReviewStatus.APPROVED && work.reviewStatus !== ReviewStatus.PUBLISHED) return { label: "查看作品审核", href: `/works/${work.id}`, waitingFor: "平台" };
  if (work.fabricRecommendations.some((item) => activeRecommendationStatuses.includes(item.status))) return { label: "查看面料推荐", href: `/me/projects/${work.id}#fabric-recommendations`, waitingFor: "设计师" };
  if (work.providerWorkProposals.some((item) => activeProviderProposalStatuses.includes(item.status))) return { label: "查看供应商方案", href: `/me/projects/${work.id}#provider-proposals`, waitingFor: "设计师" };
  if (work.cooperationRequests.some((item) => item.providerId && item.replies.length > 0 && isActiveRequest(item.status))) return { label: "继续询盘沟通", href: "/me/inquiries", waitingFor: "设计师" };
  if (!work.fabricRequests.length && !work.fabricRecommendations.length) return { label: "提交面料需求", href: `/incubation/fabric-request?workId=${work.id}`, waitingFor: "设计师" };
  if (hasAcceptedFabricRecommendation(work) && !work.sampleRequests.length) return { label: "提交打样需求", href: `/incubation/sample-request?workId=${work.id}`, waitingFor: "设计师" };
  if (work.fabricRequests.some((item) => isActiveRequest(item.status)) || work.sampleRequests.some((item) => isActiveRequest(item.status))) return { label: "等待处理进展", href: `/me/projects/${work.id}`, waitingFor: "平台" };
  if (work.cooperationRequests.some((item) => isActiveRequest(item.status))) return { label: "查看合作请求", href: `/me/projects/${work.id}#cooperation-requests`, waitingFor: "合作双方" };
  return { label: "查看作品", href: `/works/${work.id}`, waitingFor: "无" };
}

function buildTasks(work: WorkbenchWork, action: ProjectWorkbenchAction): ProjectWorkbenchTask[] {
  const tasks: ProjectWorkbenchTask[] = [];
  if (work.reviewStatus !== ReviewStatus.APPROVED && work.reviewStatus !== ReviewStatus.PUBLISHED) {
    tasks.push({ id: "work-review", label: "确认作品审核状态", status: String(work.reviewStatus), href: `/works/${work.id}`, waitingFor: "平台" });
  }
  for (const item of work.fabricRecommendations.filter((entry) => activeRecommendationStatuses.includes(entry.status))) {
    tasks.push({ id: `fabric-rec-${item.id}`, label: `查看面料推荐：${item.fabric.name}`, status: RECOMMENDATION_STATUS_LABELS[item.status], href: `/me/projects/${work.id}#fabric-recommendations`, waitingFor: "设计师" });
  }
  for (const item of work.providerWorkProposals.filter((entry) => activeProviderProposalStatuses.includes(entry.status))) {
    tasks.push({ id: `proposal-${item.id}`, label: `查看${PROVIDER_WORK_PROPOSAL_TYPE_LABELS[item.type]}：${item.title}`, status: PROVIDER_WORK_PROPOSAL_STATUS_LABELS[item.status], href: `/me/projects/${work.id}#provider-proposals`, waitingFor: "设计师" });
  }
  for (const item of work.fabricRequests.filter((entry) => isActiveRequest(entry.status))) {
    tasks.push({ id: `fabric-request-${item.id}`, label: `跟进面料需求：${item.category ?? "未命名需求"}`, status: REQUEST_STATUS_LABELS[item.status], href: `/me/projects/${work.id}#fabric-requests`, waitingFor: "平台" });
  }
  for (const item of work.sampleRequests.filter((entry) => isActiveRequest(entry.status))) {
    tasks.push({ id: `sample-request-${item.id}`, label: `跟进打样需求：${item.garmentCategory ?? "未命名需求"}`, status: REQUEST_STATUS_LABELS[item.status], href: `/me/projects/${work.id}#sample-requests`, waitingFor: "平台" });
  }
  for (const item of work.cooperationRequests.filter((entry) => isActiveRequest(entry.status))) {
    tasks.push({ id: `inquiry-${item.id}`, label: item.providerId ? `继续询盘：${item.provider?.name ?? "服务商"}` : "跟进合作请求", status: REQUEST_STATUS_LABELS[item.status], href: item.providerId ? "/me/inquiries" : `/me/projects/${work.id}#cooperation-requests`, waitingFor: item.providerId ? "供应商" : "合作双方" });
  }
  if (!tasks.length && action.waitingFor === "设计师") {
    tasks.push({ id: "next-action", label: action.label, status: "建议执行", href: action.href, waitingFor: action.waitingFor });
  }
  return tasks.slice(0, 8);
}

function timelineEvent(id: string, at: Date | null | undefined, title: string, description: string, kind: string): ProjectWorkbenchTimelineEvent | null {
  if (!at) return null;
  return { id, at, title, description: shortText(description, 140), kind };
}

function buildTimeline(work: WorkbenchWork, notifications: WorkbenchNotification[]) {
  const events: Array<ProjectWorkbenchTimelineEvent | null> = [
    timelineEvent(`work-created-${work.id}`, work.createdAt, "作品建立", work.title, "work"),
    timelineEvent(`work-updated-${work.id}`, work.updatedAt, "作品更新", `审核状态 ${work.reviewStatus}，内容状态 ${work.contentStatus}`, "work"),
    work.workIncubation ? timelineEvent(`work-incubation-${work.id}`, work.workIncubation.updatedAt, "孵化池状态更新", work.workIncubation.status, "incubation") : null,
    ...work.incubationApplications.map((item) => timelineEvent(`inc-app-${item.id}`, item.handledAt ?? item.updatedAt ?? item.createdAt, "孵化申请", `${APPLICATION_STATUS_LABELS[item.status]} / ${item.source}`, "incubation")),
    ...work.incubationProjects.map((item) => timelineEvent(`inc-project-${item.id}`, item.handledAt ?? item.updatedAt ?? item.createdAt, "孵化项目", `${item.status}${item.nextAction ? ` / ${item.nextAction}` : ""}`, "incubation")),
    ...work.fabricRequests.map((item) => timelineEvent(`fabric-request-${item.id}`, item.handledAt ?? item.updatedAt ?? item.createdAt, "面料需求", `${REQUEST_STATUS_LABELS[item.status]} / ${item.category ?? "未命名需求"}`, "fabric-request")),
    ...work.fabricRecommendations.map((item) => timelineEvent(`fabric-rec-${item.id}`, item.updatedAt ?? item.createdAt, "面料推荐", `${RECOMMENDATION_STATUS_LABELS[item.status]} / ${item.fabric.name}`, "fabric-recommendation")),
    ...work.sampleRequests.map((item) => timelineEvent(`sample-request-${item.id}`, item.handledAt ?? item.updatedAt ?? item.createdAt, "打样需求", `${REQUEST_STATUS_LABELS[item.status]} / ${item.garmentCategory ?? "未命名需求"}`, "sample-request")),
    ...work.providerWorkProposals.map((item) => timelineEvent(`provider-proposal-${item.id}`, item.updatedAt ?? item.createdAt, PROVIDER_WORK_PROPOSAL_TYPE_LABELS[item.type], `${PROVIDER_WORK_PROPOSAL_STATUS_LABELS[item.status]} / ${item.title}`, "provider-proposal")),
    ...work.cooperationRequests.flatMap((item) => [
      timelineEvent(`coop-${item.id}`, item.createdAt, item.providerId ? "发起服务商询盘" : "收到合作请求", `${REQUEST_STATUS_LABELS[item.status]} / ${item.provider?.name ?? "站内合作"}`, "cooperation"),
      timelineEvent(`coop-response-${item.id}`, item.respondedAt, "询盘有回复", item.providerResponse ?? "服务商已回复", "cooperation"),
      ...item.replies.map((reply) => timelineEvent(`reply-${reply.id}`, reply.createdAt, "站内回复", `${reply.senderRole} / ${reply.content}`, "reply"))
    ]),
    ...work.collaborationProjects.map((item) => timelineEvent(`collab-${item.id}`, item.updatedAt ?? item.createdAt, "合作项目", `${item.title} / ${item.status}`, "collaboration")),
    ...notifications.map((item) => timelineEvent(`notification-${item.id}`, item.createdAt, "相关通知", item.title, "notification"))
  ];
  return events.filter(Boolean).sort((a, b) => b!.at.getTime() - a!.at.getTime()).slice(0, 30) as ProjectWorkbenchTimelineEvent[];
}

function notificationMatchesWork(notification: WorkbenchNotification, workId: string) {
  const link = notification.linkUrl ?? "";
  return link === `/works/${workId}` || link.startsWith(`/works/${workId}#`) || link === `/me/projects/${workId}` || link.startsWith(`/me/projects/${workId}#`);
}

function buildProject(work: WorkbenchWork, notifications: WorkbenchNotification[]): ProjectWorkbenchProject {
  const relatedNotifications = notifications.filter((item) => notificationMatchesWork(item, work.id));
  const stage = calculateProjectWorkbenchStage(work);
  const nextAction = buildNextAction(work, stage);
  const lastUpdatedAt = maxDate([
    work.updatedAt,
    ...work.incubationApplications.map((item) => item.updatedAt),
    ...work.incubationProjects.map((item) => item.updatedAt),
    work.workIncubation?.updatedAt,
    ...work.fabricRequests.map((item) => item.updatedAt),
    ...work.fabricRecommendations.map((item) => item.updatedAt),
    ...work.sampleRequests.map((item) => item.updatedAt),
    ...work.providerWorkProposals.map((item) => item.updatedAt),
    ...work.cooperationRequests.map((item) => item.updatedAt),
    ...work.collaborationProjects.map((item) => item.updatedAt),
    ...relatedNotifications.map((item) => item.createdAt)
  ]);
  const tasks = buildTasks(work, nextAction);

  return {
    id: work.id,
    workId: work.id,
    title: work.title,
    description: shortText(work.description, 180),
    imageUrl: work.images[0]?.imageUrl ?? null,
    stage,
    stageLabel: PROJECT_WORKBENCH_STAGE_LABELS[stage],
    statusLabel: `${work.reviewStatus} / ${work.contentStatus}`,
    statusDescription: statusDescription(work, stage),
    nextAction,
    waitingFor: nextAction.waitingFor,
    pendingCount: tasks.length,
    lastUpdatedAt,
    notificationCount: relatedNotifications.length,
    unreadNotificationCount: relatedNotifications.filter((item) => !item.isRead).length,
    work,
    notifications: relatedNotifications,
    tasks,
    timeline: buildTimeline(work, relatedNotifications)
  };
}

export async function getDesignerProjectWorkbench(userId: string) {
  const [works, notifications] = await Promise.all([
    prisma.work.findMany({
      where: { userId },
      include: workbenchWorkInclude,
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { id: true, title: true, content: true, isRead: true, linkUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  ]);

  return works.map((work) => buildProject(work, notifications));
}

export async function getDesignerProjectWorkbenchDetail(userId: string, workId: string) {
  const projects = await getDesignerProjectWorkbench(userId);
  return projects.find((project) => project.workId === workId) ?? null;
}

export function summarizeFabricRequest(item: WorkbenchWork["fabricRequests"][number]) {
  return formatParts([
    item.category,
    item.desiredFeeling.length ? `感觉 ${item.desiredFeeling.join("、")}` : null,
    item.colorDirection && `颜色 ${item.colorDirection}`,
    item.budgetRange && `预算 ${item.budgetRange}`,
    item.remark
  ]) || "需求说明待补充";
}

export function summarizeSampleRequest(item: WorkbenchWork["sampleRequests"][number]) {
  return formatParts([
    item.garmentCategory,
    item.hasPattern ? "已有纸样" : "无纸样",
    item.hasFabric ? "已有面料" : item.needsFabricHelp ? "需要协助找面料" : null,
    item.quantity ? `数量 ${item.quantity}` : null,
    item.budgetRange && `预算 ${item.budgetRange}`,
    item.remark
  ]) || "打样需求说明待补充";
}

export function summarizeProviderProposal(item: WorkbenchWork["providerWorkProposals"][number]) {
  return formatParts([
    item.provider.name,
    item.summary ?? item.description,
    item.estimatedPrice && `预算/报价 ${item.estimatedPrice}`,
    item.estimatedTime && `周期 ${item.estimatedTime}`,
    item.moq && `MOQ ${item.moq}`
  ]) || "方案说明待补充";
}

export function summarizeCooperationRequest(item: WorkbenchWork["cooperationRequests"][number]) {
  return formatParts([
    item.provider?.name ?? "站内合作",
    item.quantity ? `数量 ${item.quantity}` : null,
    item.budgetRange && `预算 ${item.budgetRange}`,
    item.message
  ]) || "合作说明待补充";
}
