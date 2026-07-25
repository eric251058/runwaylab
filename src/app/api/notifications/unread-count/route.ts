import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });

  const count = await getUnreadNotificationCount(user.id).catch(() => 0);
  return NextResponse.json({ count });
}
