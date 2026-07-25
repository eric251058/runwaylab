import { redirect } from "next/navigation";
import { NotificationCenterClient } from "@/components/notifications/NotificationCenterClient";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function activeCategory(value?: string): NotificationCategory {
  const category = value?.toUpperCase();
  return category && NOTIFICATION_CATEGORIES.includes(category as NotificationCategory) ? (category as NotificationCategory) : "ALL";
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const params = await searchParams;
  const category = activeCategory(params?.category);
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser({ userId: user.id, category, take: 50 }),
    getUnreadNotificationCount(user.id).catch(() => 0)
  ]);

  return (
    <NotificationCenterClient
      initialItems={notifications.items}
      initialUnreadCount={unreadCount}
      activeCategory={category}
    />
  );
}
