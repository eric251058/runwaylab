import {
  CommerceAggregateType,
  CommercePaymentAttemptStatus,
  CommerceRefundStatus,
  Prisma,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus
} from "@prisma/client";

import { assertIdempotencyKey } from "@/lib/commerce/order-state-machine";
import type { PaymentNotification, PaymentProvider } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";

const PAYABLE_ORDER_STATUSES = [
  ProjectOrderStatus.RESERVATION,
  ProjectOrderStatus.PENDING_PAYMENT,
  ProjectOrderStatus.CONFIRMED
] as const;
const MAX_ONLINE_PAYMENT_CENTS = 100_000_000;

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

function assertPublicBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PaymentServiceError("支付回调域名配置无效。", "INVALID_PAYMENT_BASE_URL", 503);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new PaymentServiceError("生产支付回调必须使用 HTTPS。", "INVALID_PAYMENT_BASE_URL", 503);
  }
  return url.origin;
}

function assertProviderReady(provider: PaymentProvider) {
  if (!provider.configured || provider.name === "disabled") {
    throw new PaymentServiceError("在线支付尚未完成商户配置。", "PAYMENT_NOT_CONFIGURED", 503);
  }
}

function isPayableOrderStatus(value: ProjectOrderStatus) {
  return (PAYABLE_ORDER_STATUSES as readonly ProjectOrderStatus[]).includes(value);
}

export async function createOrderPayment(input: {
  orderId: string;
  buyerId: string;
  idempotencyKey: string;
  provider: PaymentProvider;
  publicBaseUrl: string;
}) {
  assertProviderReady(input.provider);
  let idempotencyKey: string;
  try {
    idempotencyKey = assertIdempotencyKey(input.idempotencyKey);
  } catch {
    throw new PaymentServiceError("缺少有效的幂等键，请刷新后重试。", "INVALID_IDEMPOTENCY_KEY", 422);
  }
  const baseUrl = assertPublicBaseUrl(input.publicBaseUrl);
  const order = await prisma.projectOrder.findFirst({
    where: { id: input.orderId, buyerId: input.buyerId },
    select: {
      id: true,
      title: true,
      providerId: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      currency: true,
      termsAcceptedAt: true
    }
  });
  if (!order) throw new PaymentServiceError("订单不存在或你无权付款。", "ORDER_NOT_FOUND", 404);
  if (order.providerId) {
    throw new PaymentServiceError(
      "第三方合作订单需先完成支付宝分账收款方绑定，当前不能由平台代收。",
      "MARKETPLACE_SETTLEMENT_NOT_CONFIGURED",
      409
    );
  }
  if (!isPayableOrderStatus(order.status)) {
    throw new PaymentServiceError("当前订单状态不能发起支付。", "ORDER_NOT_PAYABLE", 409);
  }
  if (order.paymentStatus === ProjectOrderPaymentStatus.PAID || order.paymentStatus === ProjectOrderPaymentStatus.REFUNDED) {
    throw new PaymentServiceError("该订单无需再次付款。", "ORDER_ALREADY_PAID", 409);
  }
  if (!order.termsAcceptedAt) {
    throw new PaymentServiceError("请先确认订单条款。", "TERMS_NOT_ACCEPTED", 409);
  }
  if (
    !Number.isSafeInteger(order.totalAmount)
    || !order.totalAmount
    || order.totalAmount <= 0
    || order.totalAmount > MAX_ONLINE_PAYMENT_CENTS
  ) {
    throw new PaymentServiceError("订单金额尚未结构化确认。", "ORDER_AMOUNT_NOT_CONFIRMED", 409);
  }
  if (order.currency !== "CNY") {
    throw new PaymentServiceError("首期在线支付仅支持人民币。", "UNSUPPORTED_CURRENCY", 409);
  }

  let attempt = await prisma.commercePaymentAttempt.findUnique({ where: { idempotencyKey } });
  if (attempt) {
    if (
      attempt.orderId !== order.id
      || attempt.provider !== input.provider.name
      || attempt.amount !== order.totalAmount
      || attempt.currency !== order.currency
    ) {
      throw new PaymentServiceError("该幂等键已用于另一笔支付。", "IDEMPOTENCY_CONFLICT", 409);
    }
    if (attempt.status === CommercePaymentAttemptStatus.CAPTURED) {
      throw new PaymentServiceError("该订单已经支付成功。", "ORDER_ALREADY_PAID", 409);
    }
  } else {
    attempt = await prisma.commercePaymentAttempt.findFirst({
      where: {
        orderId: order.id,
        provider: input.provider.name,
        amount: order.totalAmount,
        currency: order.currency,
        status: { in: [CommercePaymentAttemptStatus.CREATED, CommercePaymentAttemptStatus.PROCESSING] }
      },
      orderBy: { createdAt: "desc" }
    });
  }
  if (!attempt) {
    try {
      attempt = await prisma.$transaction(async (tx) => {
        const created = await tx.commercePaymentAttempt.create({
          data: {
            orderId: order.id,
            provider: input.provider.name,
            idempotencyKey,
            amount: order.totalAmount!,
            currency: order.currency,
            status: CommercePaymentAttemptStatus.CREATED
          }
        });
        const updated = await tx.projectOrder.updateMany({
          where: {
            id: order.id,
            paymentStatus: { in: [ProjectOrderPaymentStatus.UNPAID, ProjectOrderPaymentStatus.FAILED] }
          },
          data: {
            paymentStatus: ProjectOrderPaymentStatus.PENDING,
            status: order.status === ProjectOrderStatus.RESERVATION ? ProjectOrderStatus.PENDING_PAYMENT : order.status
          }
        });
        if (updated.count !== 1) throw new PaymentServiceError("订单支付状态已变化。", "PAYMENT_STATE_CHANGED", 409);
        await tx.commerceStateEvent.create({
          data: {
            aggregateType: CommerceAggregateType.PAYMENT,
            aggregateId: created.id,
            fromState: null,
            toState: CommercePaymentAttemptStatus.CREATED,
            actorId: input.buyerId,
            reason: "ONLINE_CHECKOUT_CREATED",
            idempotencyKey: `create:${idempotencyKey}`,
            metadata: { orderId: order.id, provider: input.provider.name, amount: order.totalAmount, currency: order.currency }
          }
        });
        return created;
      });
    } catch (error) {
      if (error instanceof PaymentServiceError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        attempt = await prisma.commercePaymentAttempt.findUnique({ where: { idempotencyKey } });
      }
      if (!attempt) throw error;
    }
  }

  const result = await input.provider.createPayment({
    orderId: order.id,
    attemptId: attempt.id,
    amountCents: attempt.amount,
    currency: attempt.currency,
    description: order.title,
    returnUrl: `${baseUrl}/me/orders/${order.id}?payment=return`,
    notifyUrl: `${baseUrl}/api/payments/alipay/notify`
  });
  if (!result.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.commercePaymentAttempt.updateMany({
        where: { id: attempt!.id, status: { in: [CommercePaymentAttemptStatus.CREATED, CommercePaymentAttemptStatus.PROCESSING] } },
        data: {
          status: CommercePaymentAttemptStatus.FAILED,
          failureCode: result.code ?? "PAYMENT_CREATE_FAILED",
          failureMessage: result.reason,
          failedAt: new Date()
        }
      });
      await tx.projectOrder.updateMany({
        where: { id: order.id, paymentStatus: ProjectOrderPaymentStatus.PENDING },
        data: { paymentStatus: ProjectOrderPaymentStatus.FAILED }
      });
    });
    throw new PaymentServiceError(result.reason, result.code ?? "PAYMENT_CREATE_FAILED", 502);
  }

  await prisma.commercePaymentAttempt.updateMany({
    where: { id: attempt.id, status: CommercePaymentAttemptStatus.CREATED },
    data: { status: CommercePaymentAttemptStatus.PROCESSING }
  });
  return { checkoutUrl: result.paymentUrl, attemptId: attempt.id };
}

export async function applyPaymentNotification(notification: PaymentNotification) {
  if (!notification.ok) {
    throw new PaymentServiceError(notification.reason, notification.code, 400);
  }
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.commercePaymentAttempt.findUnique({
      where: { id: notification.merchantReference },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
            reservationExpiresAt: true
          }
        }
      }
    });
    if (!attempt || attempt.provider !== notification.provider) {
      throw new PaymentServiceError("支付尝试不存在。", "PAYMENT_ATTEMPT_NOT_FOUND", 404);
    }
    if (attempt.amount !== notification.amountCents || attempt.currency !== notification.currency) {
      throw new PaymentServiceError("支付回调金额不匹配。", "PAYMENT_AMOUNT_MISMATCH", 409);
    }
    const replay = await tx.commerceStateEvent.findUnique({
      where: {
        aggregateType_aggregateId_idempotencyKey: {
          aggregateType: CommerceAggregateType.PAYMENT,
          aggregateId: attempt.id,
          idempotencyKey: `notify:${notification.eventId}`
        }
      }
    });
    if (replay) return { replayed: true, orderId: attempt.orderId };

    let eventToState: CommercePaymentAttemptStatus = attempt.status;
    if (notification.status === "CAPTURED") {
      if (!notification.providerPaymentId) {
        throw new PaymentServiceError("支付渠道流水号缺失。", "PROVIDER_PAYMENT_ID_MISSING", 409);
      }
      if (attempt.status === CommercePaymentAttemptStatus.CAPTURED) {
        if (attempt.providerAttemptId !== notification.providerPaymentId) {
          throw new PaymentServiceError("支付渠道流水号冲突。", "PROVIDER_PAYMENT_ID_CONFLICT", 409);
        }
      } else {
        const claimed = await tx.commercePaymentAttempt.updateMany({
          where: {
            id: attempt.id,
            status: { in: [CommercePaymentAttemptStatus.CREATED, CommercePaymentAttemptStatus.PROCESSING, CommercePaymentAttemptStatus.AUTHORIZED] }
          },
          data: {
            status: CommercePaymentAttemptStatus.CAPTURED,
            providerAttemptId: notification.providerPaymentId,
            capturedAt: notification.capturedAt ?? new Date(),
            failureCode: null,
            failureMessage: null
          }
        });
        if (claimed.count !== 1) {
          throw new PaymentServiceError("支付状态已变化，需人工复核。", "PAYMENT_STATE_CHANGED", 409);
        }
      }
      eventToState = CommercePaymentAttemptStatus.CAPTURED;
      const refundedPaymentStatuses: readonly ProjectOrderPaymentStatus[] = [
        ProjectOrderPaymentStatus.REFUNDED,
        ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
      ];
      const alreadyRefunded = refundedPaymentStatuses.includes(attempt.order.paymentStatus);
      if (!alreadyRefunded) {
        const latePaymentOrderStatuses: readonly ProjectOrderStatus[] = [
          ProjectOrderStatus.CANCELLED,
          ProjectOrderStatus.REFUND_PENDING,
          ProjectOrderStatus.REFUNDED
        ];
        const lateOrCancelled = latePaymentOrderStatuses.includes(attempt.order.status)
          || Boolean(attempt.order.reservationExpiresAt && attempt.order.reservationExpiresAt <= new Date());
        await tx.projectOrder.update({
          where: { id: attempt.orderId },
          data: {
            paymentStatus: ProjectOrderPaymentStatus.PAID,
            status: lateOrCancelled
              ? ProjectOrderStatus.REFUND_PENDING
              : attempt.order.status === ProjectOrderStatus.RESERVATION || attempt.order.status === ProjectOrderStatus.PENDING_PAYMENT
                ? ProjectOrderStatus.CONFIRMED
                : attempt.order.status
          }
        });
      }
    } else if (attempt.status !== CommercePaymentAttemptStatus.CAPTURED) {
      await tx.commercePaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: CommercePaymentAttemptStatus.FAILED,
          ...(notification.providerPaymentId ? { providerAttemptId: notification.providerPaymentId } : {}),
          failedAt: new Date(),
          failureCode: "PROVIDER_TRADE_CLOSED",
          failureMessage: "支付渠道通知交易关闭。"
        }
      });
      await tx.projectOrder.updateMany({
        where: { id: attempt.orderId, paymentStatus: ProjectOrderPaymentStatus.PENDING },
        data: { paymentStatus: ProjectOrderPaymentStatus.FAILED }
      });
      eventToState = CommercePaymentAttemptStatus.FAILED;
    }

    await tx.commerceStateEvent.create({
      data: {
        aggregateType: CommerceAggregateType.PAYMENT,
        aggregateId: attempt.id,
        fromState: attempt.status,
        toState: eventToState,
        reason: "VERIFIED_PROVIDER_NOTIFICATION",
        idempotencyKey: `notify:${notification.eventId}`,
        metadata: {
          orderId: attempt.orderId,
          provider: notification.provider,
          providerPaymentId: notification.providerPaymentId,
          providerStatus: notification.status
        }
      }
    });
    return { replayed: false, orderId: attempt.orderId };
  });
}

export async function refundOrderPayment(input: {
  orderId: string;
  actorId: string;
  amountCents: number;
  reason: string;
  idempotencyKey: string;
  provider: PaymentProvider;
}) {
  assertProviderReady(input.provider);
  let idempotencyKey: string;
  try {
    idempotencyKey = assertIdempotencyKey(input.idempotencyKey);
  } catch {
    throw new PaymentServiceError("缺少有效的幂等键。", "INVALID_IDEMPOTENCY_KEY", 422);
  }
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentServiceError("退款金额无效。", "INVALID_REFUND_AMOUNT", 422);
  }
  if (input.reason.trim().length < 4 || input.reason.trim().length > 200) {
    throw new PaymentServiceError("请填写 4–200 字退款原因。", "INVALID_REFUND_REASON", 422);
  }

  const prepared = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "ProjectOrder" WHERE "id" = ${input.orderId} FOR UPDATE
    `);
    if (!locked.length) throw new PaymentServiceError("订单不存在。", "ORDER_NOT_FOUND", 404);
    const order = await tx.projectOrder.findUnique({
      where: { id: input.orderId },
      include: {
        paymentAttempts: {
          where: { provider: input.provider.name, status: CommercePaymentAttemptStatus.CAPTURED },
          orderBy: { capturedAt: "desc" },
          take: 1
        },
        refunds: { where: { status: { in: [CommerceRefundStatus.PROCESSING, CommerceRefundStatus.SUCCEEDED] } } }
      }
    });
    if (!order) throw new PaymentServiceError("订单不存在。", "ORDER_NOT_FOUND", 404);
    const attempt = order.paymentAttempts[0];
    if (!attempt?.providerAttemptId) {
      throw new PaymentServiceError("没有可退款的线上支付流水。", "PAYMENT_NOT_REFUNDABLE", 409);
    }
    const existing = await tx.commerceRefund.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.orderId !== order.id || existing.amount !== input.amountCents || existing.reason !== input.reason.trim()) {
        throw new PaymentServiceError("该幂等键已用于另一笔退款。", "IDEMPOTENCY_CONFLICT", 409);
      }
      const alreadyRefunded = order.refunds
        .filter((item) => item.status === CommerceRefundStatus.SUCCEEDED)
        .reduce((sum, item) => sum + item.amount, 0);
      return { order, attempt, refund: existing, alreadyRefunded, replayed: true };
    }
    const committedRefunds = order.refunds.reduce((sum, item) => sum + item.amount, 0);
    if (committedRefunds + input.amountCents > attempt.amount) {
      throw new PaymentServiceError("退款金额超过实际支付金额或已有退款正在处理。", "REFUND_EXCEEDS_CAPTURED_AMOUNT", 409);
    }

    const refund = await tx.commerceRefund.create({
      data: {
        orderId: order.id,
        paymentAttemptId: attempt.id,
        provider: input.provider.name,
        idempotencyKey,
        amount: input.amountCents,
        currency: attempt.currency,
        status: CommerceRefundStatus.PROCESSING,
        reason: input.reason.trim()
      }
    });
    await tx.projectOrder.update({
      where: { id: order.id },
      data: { status: ProjectOrderStatus.REFUND_PENDING }
    });
    await tx.commerceStateEvent.create({
      data: {
        aggregateType: CommerceAggregateType.REFUND,
        aggregateId: refund.id,
        fromState: CommerceRefundStatus.REQUESTED,
        toState: CommerceRefundStatus.PROCESSING,
        actorId: input.actorId,
        reason: input.reason.trim(),
        idempotencyKey: `refund:${idempotencyKey}`,
        metadata: { orderId: order.id, paymentAttemptId: attempt.id, amount: input.amountCents }
      }
    });
    const alreadyRefunded = order.refunds
      .filter((item) => item.status === CommerceRefundStatus.SUCCEEDED)
      .reduce((sum, item) => sum + item.amount, 0);
    return { order, attempt, refund, alreadyRefunded, replayed: false };
  });

  const { order, attempt, refund, alreadyRefunded } = prepared;
  if (prepared.replayed && refund.status !== CommerceRefundStatus.PROCESSING) {
    if (refund.status === CommerceRefundStatus.FAILED) {
      throw new PaymentServiceError(
        refund.failureMessage ?? "上一笔退款失败，请复核后刷新页面重新发起。",
        refund.failureCode ?? "REFUND_FAILED",
        409
      );
    }
    return { refundId: refund.id, status: refund.status, replayed: true };
  }

  const result = await input.provider.refundPayment({
    orderId: order.id,
    refundId: refund.id,
    providerPaymentId: attempt.providerAttemptId!,
    amountCents: refund.amount,
    currency: refund.currency,
    reason: input.reason.trim()
  });
  if (!result.ok) {
    const failureStatus = result.retryable ? CommerceRefundStatus.PROCESSING : CommerceRefundStatus.FAILED;
    await prisma.$transaction(async (tx) => {
      await tx.commerceRefund.update({
        where: { id: refund.id },
        data: {
          status: failureStatus,
          failureCode: result.code ?? "REFUND_FAILED",
          failureMessage: result.reason
        }
      });
      await tx.commerceStateEvent.create({
        data: {
          aggregateType: CommerceAggregateType.REFUND,
          aggregateId: refund.id,
          fromState: CommerceRefundStatus.PROCESSING,
          toState: failureStatus,
          actorId: input.actorId,
          reason: result.reason,
          idempotencyKey: `refund-failure:${idempotencyKey}:${result.code ?? "REFUND_FAILED"}`,
          metadata: { orderId: order.id, retryable: Boolean(result.retryable) }
        }
      });
    });
    throw new PaymentServiceError(result.reason, result.code ?? "REFUND_FAILED", 502);
  }

  const totalRefunded = alreadyRefunded + refund.amount;
  const fullyRefunded = totalRefunded === attempt.amount;
  await prisma.$transaction(async (tx) => {
    await tx.commerceRefund.update({
      where: { id: refund.id },
      data: {
        status: CommerceRefundStatus.SUCCEEDED,
        providerRefundId: result.providerRefundId,
        completedAt: new Date(),
        failureCode: null,
        failureMessage: null
      }
    });
    await tx.projectOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: fullyRefunded ? ProjectOrderPaymentStatus.REFUNDED : ProjectOrderPaymentStatus.PARTIALLY_REFUNDED,
        status: fullyRefunded ? ProjectOrderStatus.REFUNDED : ProjectOrderStatus.REFUND_PENDING
      }
    });
    await tx.commerceStateEvent.create({
      data: {
        aggregateType: CommerceAggregateType.REFUND,
        aggregateId: refund.id,
        fromState: CommerceRefundStatus.PROCESSING,
        toState: CommerceRefundStatus.SUCCEEDED,
        actorId: input.actorId,
        reason: input.reason.trim(),
        idempotencyKey: `refund-success:${idempotencyKey}`,
        metadata: { orderId: order.id, providerRefundId: result.providerRefundId, fullyRefunded }
      }
    });
  });
  return { refundId: refund.id, status: CommerceRefundStatus.SUCCEEDED, replayed: prepared.replayed };
}
