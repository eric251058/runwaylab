import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotificationsForUser, NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notifications";

function categoryFromUrl(url: string) {
  const value = new URL(url).searchParams.get("category")?.toUpperCase();
  return value && NOTIFICATION_CATEGORIES.includes(value as NotificationCategory) ? (value as NotificationCategory) : "ALL";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const take = Number.parseInt(url.searchParams.get("take") ?? "30", 10);
  const data = await getNotificationsForUser({
    userId: user.id,
    category: categoryFromUrl(request.url),
    cursor,
    take: Number.isFinite(take) ? take : 30
  });

  return NextResponse.json(data);
}
