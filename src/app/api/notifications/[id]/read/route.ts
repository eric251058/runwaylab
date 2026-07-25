import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function handleRead(context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const notification = await markNotificationRead(user.id, id);
  if (!notification) return NextResponse.json({ message: "通知不存在。" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, context: RouteContext) {
  return handleRead(context);
}

export async function PATCH(_request: Request, context: RouteContext) {
  return handleRead(context);
}
