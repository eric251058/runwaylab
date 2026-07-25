import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const result = await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true, count: result.count });
}
