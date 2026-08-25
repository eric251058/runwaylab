import { Prisma, ReviewStatus, ReviewTargetType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { getPrivateCollaborationProjectForViewer } from "@/lib/private-collaboration-projects";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const contactPattern = /(?:微信|微.?信|v信|vx|wechat|whatsapp|telegram|手机|电话|邮箱|e-?mail|\b1[3-9]\d{9}\b)/i;

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(8, "请至少写 8 个字，说明真实合作体验。").max(600).refine(
    (value) => !contactPattern.test(value),
    "评价中不要填写电话、邮箱或站外联系方式。"
  )
});

type RouteContext = {
  params: Promise<{ id: string; orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit("verified-order-review:" + user.id + ":day", {
    windowMs: 24 * 60 * 60 * 1000,
    limit: 8
  });
  if (limit.limited) return tooManyRequests("今天提交评价的次数较多，请稍后再试。", limit.retryAfter);

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "请检查评价内容。" },
      { status: 422 }
    );
  }

  const { id, orderId } = await context.params;
  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) {
    return NextResponse.json({ message: "合作项目不存在或你无权访问。" }, { status: 404 });
  }

  const order = await prisma.projectOrder.findFirst({
    where: { id: orderId, projectId: project.id, preorderCampaignId: null },
    select: { id: true, buyerId: true, providerId: true, status: true }
  });
  if (!order) return NextResponse.json({ message: "合作订单不存在。" }, { status: 404 });
  if (order.buyerId !== user.id) {
    return NextResponse.json({ message: "只有该订单的项目方可以评价服务商。" }, { status: 403 });
  }
  if (order.status !== "COMPLETED") {
    return NextResponse.json({ message: "完成验收后才能提交成交评价。" }, { status: 409 });
  }
  if (!order.providerId || order.providerId !== project.providerId) {
    return NextResponse.json({ message: "订单服务商信息不完整，暂时不能评价。" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          reviewerId: user.id,
          targetType: ReviewTargetType.PROVIDER,
          providerId: order.providerId,
          projectId: project.id,
          orderId: order.id,
          rating: parsed.data.rating,
          content: parsed.data.content,
          status: ReviewStatus.PUBLISHED
        }
      });
      await tx.projectNegotiationMessage.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          body: "项目方已提交已验证成交评价：" + parsed.data.rating + " 星。"
        }
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "这笔订单已经评价过。" }, { status: 409 });
    }
    throw error;
  }

  await createNotificationSafe({
    recipientId: project.provider?.ownerId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: "收到一条已验证成交评价",
    body: project.title + "：" + parsed.data.rating + " 星评价",
    targetUrl: "/providers/" + order.providerId,
    dedupe: false
  });

  revalidatePath("/me/projects/collaboration/" + project.id);
  revalidatePath("/me/project-orders");
  revalidatePath("/providers/" + order.providerId);
  revalidatePath("/providers");
  return NextResponse.json({ message: "评价已发布，并标记为已验证成交。" });
}
