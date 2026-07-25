import { NotificationType, type Notification } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const NOTIFICATION_CATEGORIES = ["ALL", "SOCIAL", "WORK", "INQUIRY", "PROVIDER", "INCUBATION", "SYSTEM", "MODERATION"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_EVENTS = {
  COMMENT_CREATED: "COMMENT_CREATED",
  WORK_APPROVED: "WORK_APPROVED",
  WORK_REJECTED: "WORK_REJECTED",
  WORK_OFFLINED: "WORK_OFFLINED",
  INCUBATION_RECOMMENDED: "INCUBATION_RECOMMENDED",
  INCUBATION_CANDIDATE: "INCUBATION_CANDIDATE",
  INQUIRY_RECEIVED: "INQUIRY_RECEIVED",
  INQUIRY_REPLIED: "INQUIRY_REPLIED",
  FABRIC_RECOMMENDED: "FABRIC_RECOMMENDED",
  PROVIDER_PROPOSAL_RECEIVED: "PROVIDER_PROPOSAL_RECEIVED",
  PROVIDER_PROPOSAL_UPDATED: "PROVIDER_PROPOSAL_UPDATED",
  REQUEST_HANDLED: "REQUEST_HANDLED",
  CHALLENGE_RESULT: "CHALLENGE_RESULT"
} as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

type CreateNotificationInput = {
  recipientId?: string | null;
  actorId?: string | null;
  eventType: NotificationEventType;
  title: string;
  body: string;
  targetUrl?: string | null;
  allowSelfNotification?: boolean;
  dedupe?: boolean;
};

export type NotificationDto = {
  id: string;
  category: Exclude<NotificationCategory, "ALL">;
  type: NotificationEventType | NotificationType;
  title: string;
  body: string;
  targetUrl: string;
  isRead: boolean;
  createdAt: string;
  actor: null;
};

export function sanitizeNotificationTargetUrl(value?: string | null) {
  const fallback = "/notifications";
  const url = value?.trim();
  if (!url) return fallback;
  if (!url.startsWith("/")) return fallback;
  if (url.startsWith("//")) return fallback;
  const lower = url.toLowerCase();
  if (lower.startsWith("/javascript:") || lower.startsWith("/data:")) return fallback;
  return url.slice(0, 500);
}

function redactContactSecrets(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[已隐藏邮箱]")
    .replace(/(?:\+?86[-\s]?)?1[3-9]\d{9}/g, "[已隐藏手机号]")
    .replace(/(wechat|微信|whatsapp)[:：]\s*\S+/gi, "$1：[已隐藏]");
}

function compactText(value: string, limit: number) {
  return redactContactSecrets(value).replace(/\s+/g, " ").trim().slice(0, limit);
}

export function safeNotificationSummary(value: string, limit = 160) {
  return compactText(value, limit);
}

function eventToStoredType(eventType: NotificationEventType): NotificationType | null {
  if (eventType === NOTIFICATION_EVENTS.COMMENT_CREATED) return NotificationType.REQUEST_HANDLED;
  if (eventType === NOTIFICATION_EVENTS.WORK_APPROVED) return NotificationType.WORK_APPROVED;
  if (eventType === NOTIFICATION_EVENTS.WORK_REJECTED) return NotificationType.WORK_REJECTED;
  if (eventType === NOTIFICATION_EVENTS.WORK_OFFLINED) return NotificationType.WORK_REJECTED;
  if (eventType === NOTIFICATION_EVENTS.INCUBATION_RECOMMENDED) return NotificationType.INCUBATION_RECOMMENDED;
  if (eventType === NOTIFICATION_EVENTS.INCUBATION_CANDIDATE) return NotificationType.INCUBATION_CANDIDATE;
  if (eventType === NOTIFICATION_EVENTS.CHALLENGE_RESULT) return NotificationType.CHALLENGE_RESULT;
  if (
    [
      NOTIFICATION_EVENTS.INQUIRY_RECEIVED,
      NOTIFICATION_EVENTS.INQUIRY_REPLIED,
      NOTIFICATION_EVENTS.FABRIC_RECOMMENDED,
      NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_RECEIVED,
      NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
      NOTIFICATION_EVENTS.REQUEST_HANDLED
    ].includes(eventType)
  ) {
    return NotificationType.REQUEST_HANDLED;
  }
  return null;
}

function virtualNotificationType(notification: Pick<Notification, "type" | "title" | "linkUrl">): NotificationEventType | NotificationType {
  const link = notification.linkUrl ?? "";
  if (notification.type === NotificationType.REQUEST_HANDLED && notification.title === "有人评论了你的作品" && link.startsWith("/works/")) {
    return NOTIFICATION_EVENTS.COMMENT_CREATED;
  }
  if (notification.type === NotificationType.WORK_REJECTED && notification.title === "作品已下架") {
    return NOTIFICATION_EVENTS.WORK_OFFLINED;
  }
  return notification.type;
}

function notificationCategory(notification: Pick<Notification, "type" | "linkUrl">): Exclude<NotificationCategory, "ALL"> {
  const workTypes: NotificationType[] = [NotificationType.WORK_APPROVED, NotificationType.WORK_REJECTED];
  const incubationTypes: NotificationType[] = [NotificationType.INCUBATION_RECOMMENDED, NotificationType.INCUBATION_CANDIDATE];
  if (workTypes.includes(notification.type)) return "WORK";
  if (incubationTypes.includes(notification.type)) return "INCUBATION";
  if (notification.type === NotificationType.CHALLENGE_RESULT) return "SYSTEM";
  const link = notification.linkUrl ?? "";
  if (notification.type === NotificationType.REQUEST_HANDLED && link.startsWith("/works/")) return "SOCIAL";
  if (link.startsWith("/me/inquiries") || link.startsWith("/provider-center/inquiries")) return "INQUIRY";
  if (link.startsWith("/provider-center") || link.startsWith("/works/")) return "PROVIDER";
  return "SYSTEM";
}

export function toNotificationDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    category: notificationCategory(notification),
    type: virtualNotificationType(notification),
    title: notification.title,
    body: notification.content,
    targetUrl: sanitizeNotificationTargetUrl(notification.linkUrl),
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    actor: null
  };
}

export async function createNotification(input: CreateNotificationInput) {
  const storedType = eventToStoredType(input.eventType);
  if (!input.recipientId || !storedType) return null;
  if (!input.allowSelfNotification && input.actorId && input.actorId === input.recipientId) return null;

  const data = {
    userId: input.recipientId,
    type: storedType,
    title: compactText(input.title, 120),
    content: compactText(input.body, 500),
    linkUrl: sanitizeNotificationTargetUrl(input.targetUrl)
  };
  if (!data.title || !data.content) return null;

  if (input.dedupe !== false) {
    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        linkUrl: data.linkUrl,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
      },
      select: { id: true }
    });
    if (duplicate) return duplicate;
  }

  return prisma.notification.create({ data });
}

export async function createNotificationSafe(input: CreateNotificationInput) {
  return createNotification(input).catch((error) => {
    console.error("Notification creation failed", {
      errorType: error instanceof Error ? error.name : typeof error
    });
    return null;
  });
}

export async function createNotificationForMany(inputs: CreateNotificationInput[]) {
  const results = await Promise.all(inputs.map((input) => createNotificationSafe(input)));
  return results.filter(Boolean).length;
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function getNotificationsForUser({
  userId,
  category = "ALL",
  cursor,
  take = 30
}: {
  userId: string;
  category?: NotificationCategory;
  cursor?: string | null;
  take?: number;
}) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 50),
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined
  });
  const dtos = items.map(toNotificationDto).filter((item) => category === "ALL" || item.category === category);
  return {
    items: dtos,
    nextCursor: items.length === take ? items.at(-1)?.id ?? null : null
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, isRead: true }
  });
  if (!notification) return null;
  if (notification.isRead) return notification;
  return prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
    select: { id: true, isRead: true }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
}
