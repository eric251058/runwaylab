import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { getPrivateCollaborationProjectForViewer } from "@/lib/private-collaboration-projects";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const optionalNote = z.string().trim().max(500).optional();
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SUBMIT_PAYMENT_EVIDENCE"),
    amount: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "请填写正确的付款金额。").refine((value) => Number(value) > 0, "付款金额必须大于 0。"),
    reference: z.string().trim().min(3, "请填写付款凭证编号。").max(120),
    note: optionalNote
  }),
  z.object({
    action: z.literal("CONFIRM_PAYMENT"),
    attemptId: z.string().min(1)
  }),
  z.object({
    action: z.literal("REJECT_PAYMENT"),
    attemptId: z.string().min(1),
    reason: z.string().trim().min(3, "请说明未确认到账的原因。").max(300)
  }),
  z.object({
    action: z.literal("START_FULFILLMENT"),
    note: optionalNote
  }),
  z.object({
    action: z.literal("MARK_DELIVERED"),
    deliveryMethod: z.string().trim().min(2, "请填写交付方式。").max(80),
    evidenceReference: z.string().trim().min(3, "请填写物流单号或交付凭证编号。").max(120),
    note: optionalNote
  }),
  z.object({
    action: z.literal("ACCEPT_DELIVERY"),
    note: optionalNote
  })
]);

type RouteContext = {
  params: Promise<{ id: string; orderId: string }>;
};

function amountToMinor(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function actionMessage(action: z.infer<typeof actionSchema>["action"]) {
  if (action === "SUBMIT_PAYMENT_EVIDENCE") return "付款凭证已提交，等待服务商确认到账。";
  if (action === "CONFIRM_PAYMENT") return "服务商已确认到账。";
  if (action === "REJECT_PAYMENT") return "服务商未确认到账，项目方可更正后重新提交。";
  if (action === "START_FULFILLMENT") return "服务商已确认开始交付。";
  if (action === "MARK_DELIVERED") return "服务商已提交交付凭证，等待项目方验收。";
  return "项目方已完成验收。";
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit("private-project-order-action:" + user.id + ":30m", {
    windowMs: 30 * 60 * 1000,
    limit: 20
  });
  if (limit.limited) return tooManyRequests("操作较频繁，请稍后再试。", limit.retryAfter);

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "请检查操作内容。" },
      { status: 422 }
    );
  }

  const action = parsed.data;
  const { id, orderId } = await context.params;
  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) {
    return NextResponse.json({ message: "合作项目不存在或你无权访问。" }, { status: 404 });
  }

  const order = await prisma.projectOrder.findFirst({
    where: { id: orderId, projectId: project.id, preorderCampaignId: null },
    select: {
      id: true,
      buyerId: true,
      providerId: true,
      paymentStatus: true,
      status: true,
      fulfillmentStatus: true
    }
  });
  if (!order) return NextResponse.json({ message: "合作订单不存在。" }, { status: 404 });

  const isBuyer = order.buyerId === user.id;
  const isProvider = project.provider?.ownerId === user.id && order.providerId === project.providerId;
  const now = new Date();
  let recipientId: string | null | undefined;
  let notificationTitle = "合作订单已更新";

  if (action.action === "SUBMIT_PAYMENT_EVIDENCE") {
    if (!isBuyer) return NextResponse.json({ message: "只有项目方可以提交付款凭证。" }, { status: 403 });
    if (order.paymentStatus === "PAID") return NextResponse.json({ message: "该订单已确认到账。" }, { status: 409 });

    const amount = amountToMinor(action.amount);
    const submitted = await prisma.$transaction(async (tx) => {
      const pending = await tx.commercePaymentAttempt.findFirst({
        where: { orderId: order.id, status: { in: ["PROCESSING", "CAPTURED"] } },
        select: { id: true }
      });
      if (pending) return false;
      const latestRejected = await tx.commercePaymentAttempt.findFirst({
        where: { orderId: order.id, status: "FAILED" },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      });
      const fingerprint = createHash("sha256")
        .update(order.id + ":" + action.reference + ":" + action.amount + ":" + (latestRejected?.id ?? "initial"))
        .digest("hex");

      await tx.commercePaymentAttempt.create({
        data: {
          orderId: order.id,
          provider: "OFF_PLATFORM:" + order.id,
          providerAttemptId: action.reference,
          idempotencyKey: "private-payment:" + fingerprint,
          amount,
          currency: "CNY",
          status: "PROCESSING"
        }
      });
      const claimed = await tx.projectOrder.updateMany({
        where: { id: order.id, paymentStatus: { in: ["UNPAID", "FAILED"] } },
        data: { paymentStatus: "PENDING" }
      });
      if (claimed.count !== 1) throw new Error("PAYMENT_STATE_CHANGED");
      await tx.projectNegotiationMessage.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          body: "项目方已提交线下付款凭证。金额：¥" + action.amount + "；凭证编号：" + action.reference + (action.note ? "；备注：" + action.note : "")
        }
      });
      return true;
    }).catch((error) => {
      if (error instanceof Error && error.message === "PAYMENT_STATE_CHANGED") return false;
      throw error;
    });
    if (!submitted) return NextResponse.json({ message: "已有待确认付款凭证或订单状态已变化。" }, { status: 409 });
    recipientId = project.provider?.ownerId;
    notificationTitle = "项目方提交了付款凭证";
  } else if (action.action === "CONFIRM_PAYMENT") {
    if (!isProvider) return NextResponse.json({ message: "只有当前服务商可以确认到账。" }, { status: 403 });

    const confirmed = await prisma.$transaction(async (tx) => {
      const attempt = await tx.commercePaymentAttempt.findFirst({
        where: { id: action.attemptId, orderId: order.id, status: "PROCESSING" },
        select: { id: true, amount: true }
      });
      if (!attempt) return false;
      const claimed = await tx.projectOrder.updateMany({
        where: { id: order.id, paymentStatus: "PENDING" },
        data: { paymentStatus: "PAID", totalAmount: attempt.amount }
      });
      if (claimed.count !== 1) return false;
      await tx.commercePaymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "CAPTURED", capturedAt: now }
      });
      await tx.projectNegotiationMessage.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          body: "服务商已确认线下款项到账。"
        }
      });
      return true;
    });
    if (!confirmed) return NextResponse.json({ message: "付款凭证已处理或订单状态已变化。" }, { status: 409 });
    recipientId = order.buyerId;
    notificationTitle = "服务商已确认到账";
  } else if (action.action === "REJECT_PAYMENT") {
    if (!isProvider) return NextResponse.json({ message: "只有当前服务商可以退回付款凭证。" }, { status: 403 });

    const rejected = await prisma.$transaction(async (tx) => {
      const attempt = await tx.commercePaymentAttempt.findFirst({
        where: { id: action.attemptId, orderId: order.id, status: "PROCESSING" },
        select: { id: true }
      });
      if (!attempt) return false;
      const claimed = await tx.projectOrder.updateMany({
        where: { id: order.id, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED" }
      });
      if (claimed.count !== 1) return false;
      await tx.commercePaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureCode: "OFF_PLATFORM_NOT_CONFIRMED",
          failureMessage: action.reason
        }
      });
      await tx.projectNegotiationMessage.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          body: "服务商未确认该笔线下款项到账。原因：" + action.reason
        }
      });
      return true;
    });
    if (!rejected) return NextResponse.json({ message: "付款凭证已处理或订单状态已变化。" }, { status: 409 });
    recipientId = order.buyerId;
    notificationTitle = "服务商退回了付款凭证";
  } else if (action.action === "START_FULFILLMENT") {
    if (!isProvider) return NextResponse.json({ message: "只有当前服务商可以开始交付。" }, { status: 403 });

    const claimed = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectOrder.updateMany({
        where: {
          id: order.id,
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          fulfillmentStatus: "NOT_STARTED"
        },
        data: { status: "IN_PROGRESS", fulfillmentStatus: "PRODUCTION" }
      });
      if (updated.count !== 1) return false;
      await tx.projectMilestone.updateMany({
        where: { projectId: project.id, stage: "DELIVERY_START", status: { not: "COMPLETED" } },
        data: { status: "COMPLETED", completedAt: now, note: action.note ?? "服务商已开始履约。" }
      });
      await tx.projectNegotiationMessage.create({
        data: { projectId: project.id, senderId: user.id, body: "服务商已开始履约。" + (action.note ? " " + action.note : "") }
      });
      return true;
    });
    if (!claimed) return NextResponse.json({ message: "订单已经开始交付或当前状态不允许操作。" }, { status: 409 });
    recipientId = order.buyerId;
    notificationTitle = "服务商已开始交付";
  } else if (action.action === "MARK_DELIVERED") {
    if (!isProvider) return NextResponse.json({ message: "只有当前服务商可以提交交付凭证。" }, { status: 403 });

    const delivered = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectOrder.updateMany({
        where: {
          id: order.id,
          status: { in: ["CONFIRMED", "IN_PROGRESS", "PRODUCTION", "SHIPPED"] },
          fulfillmentStatus: { notIn: ["DELIVERED", "EXCEPTION"] }
        },
        data: {
          status: "SHIPPED",
          fulfillmentStatus: "DELIVERED",
          trackingCompany: action.deliveryMethod,
          trackingNumber: action.evidenceReference
        }
      });
      if (updated.count !== 1) return false;
      await tx.projectMilestone.updateMany({
        where: { projectId: project.id, stage: "DELIVERY_ACCEPTANCE", status: "TODO" },
        data: { status: "IN_PROGRESS", note: action.note ?? "服务商已提交交付凭证，待项目方验收。" }
      });
      await tx.projectNegotiationMessage.create({
        data: {
          projectId: project.id,
          senderId: user.id,
          body: "服务商已提交交付凭证。方式：" + action.deliveryMethod + "；凭证编号：" + action.evidenceReference + (action.note ? "；备注：" + action.note : "")
        }
      });
      return true;
    });
    if (!delivered) return NextResponse.json({ message: "交付凭证已提交或当前状态不允许操作。" }, { status: 409 });
    recipientId = order.buyerId;
    notificationTitle = "服务商提交了交付凭证";
  } else {
    if (!isBuyer) return NextResponse.json({ message: "只有项目方可以完成验收。" }, { status: 403 });

    const accepted = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectOrder.updateMany({
        where: { id: order.id, status: "SHIPPED", fulfillmentStatus: "DELIVERED" },
        data: { status: "COMPLETED" }
      });
      if (updated.count !== 1) return false;
      await tx.projectMilestone.updateMany({
        where: { projectId: project.id, stage: "DELIVERY_ACCEPTANCE", status: { not: "COMPLETED" } },
        data: { status: "COMPLETED", completedAt: now, note: action.note ?? "项目方已确认验收。" }
      });
      await tx.projectNegotiationMessage.create({
        data: { projectId: project.id, senderId: user.id, body: "项目方已完成交付验收。" + (action.note ? " " + action.note : "") }
      });
      return true;
    });
    if (!accepted) return NextResponse.json({ message: "订单尚未交付或已经完成验收。" }, { status: 409 });
    recipientId = project.provider?.ownerId;
    notificationTitle = "项目方已完成验收";
  }

  await createNotificationSafe({
    recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: notificationTitle,
    body: project.title + "：" + actionMessage(action.action),
    targetUrl: "/me/projects/collaboration/" + project.id,
    dedupe: false
  });

  revalidatePath("/me/projects/collaboration/" + project.id);
  revalidatePath("/me/project-orders");
  revalidatePath("/me/projects");
  return NextResponse.json({ message: actionMessage(action.action) });
}
