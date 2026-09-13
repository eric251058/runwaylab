import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { supportInput } from "@/lib/support";
import { checkRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ message: "请求来源不正确。" }, { status: 403 });
  const parsed = supportInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "请填写10至2000字的说明并选择申请类型。" }, { status: 400 });
  const rate = checkRateLimit(`support:${user.id}`, { limit: 10, windowMs: 3600000 });
  if (rate.limited) return NextResponse.json({ message: "提交次数较多，请稍后再试。" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  try {
    const item = await prisma.supportRequest.upsert({
      where: { requesterId_clientId: { requesterId: user.id, clientId: parsed.data.clientId } },
      create: { ...parsed.data, requesterId: user.id }, update: {}, select: { id: true, message: true, category: true }
    });
    if (item.message !== parsed.data.message || item.category !== parsed.data.category) return NextResponse.json({ message: "上次申请已保存，请刷新查看记录后再提交新申请。" }, { status: 409 });
    return NextResponse.json({ id: item.id });
  } catch {
    return NextResponse.json({ message: "暂时无法保存，请保留内容后重试。" }, { status: 503 });
  }
}
