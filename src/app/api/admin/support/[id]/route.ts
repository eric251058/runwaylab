import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { supportReply } from "@/lib/support";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ message: "无操作权限。" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ message: "请求来源不正确。" }, { status: 403 });
  const parsed = supportReply.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "请填写5至2000字的处理结果。" }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.supportRequest.updateMany({
      where: { id, status: "PENDING", version: parsed.data.version },
      data: { reply: parsed.data.reply, status: "RESOLVED", handledById: admin.id, handledAt: new Date(), version: { increment: 1 } }
    });
    if (!result.count) return NextResponse.json({ message: "申请已被处理或不存在，请刷新查看。" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "回复未保存，请保留内容后重试。" }, { status: 503 });
  }
}
