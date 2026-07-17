import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { cleanReplyContent } from "@/lib/provider-experience";
import { prisma } from "@/lib/prisma";
import { providerBelongsToUser } from "@/lib/supply-network";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

async function getInquiryForUser(inquiryId: string, user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const inquiry = await prisma.cooperationRequest.findUnique({
    where: { id: inquiryId },
    include: {
      provider: { select: { id: true, name: true, ownerId: true, contactEmail: true } },
      user: { select: { id: true, nickname: true } },
      work: { select: { id: true, title: true } }
    }
  });

  if (!inquiry) return { inquiry: null, side: null as "DESIGNER" | "PROVIDER" | "ADMIN" | null };
  if (user.role === "ADMIN") return { inquiry, side: "ADMIN" as const };
  if (inquiry.userId === user.id) return { inquiry, side: "DESIGNER" as const };
  if (inquiry.provider && providerBelongsToUser(inquiry.provider, user)) return { inquiry, side: "PROVIDER" as const };
  return { inquiry: null, side: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("请先登录。", 401);

  const { id } = await context.params;
  const { inquiry } = await getInquiryForUser(id, user);
  if (!inquiry) return jsonError("询盘不存在或没有权限查看。", 404);

  const replies = await prisma.cooperationRequestReply.findMany({
    where: { inquiryId: id },
    include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" }
  });

  await prisma.cooperationRequestReply.updateMany({
    where: {
      inquiryId: id,
      senderId: { not: user.id },
      isRead: false
    },
    data: { isRead: true }
  });

  return NextResponse.json({ replies });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError("请先登录。", 401);

  const { id } = await context.params;
  const { inquiry, side } = await getInquiryForUser(id, user);
  if (!inquiry || !side) return jsonError("询盘不存在或没有权限回复。", 404);
  if (inquiry.status === RequestStatus.CLOSED || inquiry.status === RequestStatus.COMPLETED) {
    return jsonError("询盘已结束，不能继续回复。", 409);
  }

  const body = (await request.json().catch(() => null)) as { content?: unknown; intent?: string } | null;
  const content = cleanReplyContent(body?.content);
  if (!content) return jsonError("请填写回复内容。", 422);
  if (content.length > 1000) return jsonError("回复最多 1000 个字。", 422);

  const now = new Date();
  const reply = await prisma.cooperationRequestReply.create({
    data: {
      inquiryId: inquiry.id,
      senderId: user.id,
      senderRole: side,
      content,
      isRead: false
    },
    include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } }
  });

  const nextStatus = side === "PROVIDER" ? RequestStatus.QUOTED : RequestStatus.EVALUATED;
  await prisma.cooperationRequest.update({
    where: { id: inquiry.id },
    data: {
      status: body?.intent === "close" ? RequestStatus.CLOSED : nextStatus,
      providerResponse: side === "PROVIDER" ? content : inquiry.providerResponse,
      viewedAt: inquiry.viewedAt ?? now,
      respondedAt: side === "PROVIDER" ? now : inquiry.respondedAt,
      handledAt: body?.intent === "close" ? now : inquiry.handledAt
    }
  });

  if (side === "PROVIDER") {
    await createNotificationSafe({
      userId: inquiry.userId,
      title: "服务商已回复询盘",
      content: `${inquiry.provider?.name ?? "服务商"} 回复了你的询盘。`,
      linkUrl: "/me/inquiries"
    });
  } else {
    await createNotificationSafe({
      userId: inquiry.provider?.ownerId,
      title: "设计师补充了询盘",
      content: `${inquiry.user.nickname} 补充了询盘信息。`,
      linkUrl: "/provider-center/inquiries"
    });
  }

  revalidatePath("/provider-center/inquiries");
  revalidatePath("/me/inquiries");
  revalidatePath("/me");

  return NextResponse.json({ reply, message: "回复已发送。" }, { status: 201 });
}
