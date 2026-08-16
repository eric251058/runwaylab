import { createHash } from "node:crypto";
import {
  CommerceAggregateType,
  CommerceIdempotencyStatus,
  Prisma,
  ProjectOrderPaymentStatus,
  ProjectOrderStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_RESERVATION_STATUSES,
  calculateOrderTotal,
  canOpenLimitedPreorder,
  canViewProject,
  type ProjectUser
} from "@/lib/projects/rules";

const IDEMPOTENCY_SCOPE = "limited-preorder:create";
const TERMS_VERSION = "limited-preorder-v1";

export class PreorderError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message);
  }
}

type CreatePreorderInput = {
  user: ProjectUser;
  projectRef: string;
  productId: string;
  skuId: string | null;
  quantity: number;
  buyerNote: string | null;
  idempotencyKey: string;
};

function requestHash(input: CreatePreorderInput) {
  return createHash("sha256").update(JSON.stringify({
    userId: input.user.id,
    projectRef: input.projectRef,
    productId: input.productId,
    skuId: input.skuId,
    quantity: input.quantity,
    buyerNote: input.buyerNote
  })).digest("hex");
}

export async function createLimitedPreorder(input: CreatePreorderInput) {
  const hash = requestHash(input);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existingKey = await tx.commerceIdempotencyRecord.findUnique({
          where: { scope_key: { scope: IDEMPOTENCY_SCOPE, key: input.idempotencyKey } }
        });
        if (existingKey && existingKey.requestHash !== hash) {
          throw new PreorderError("该提交标识已用于其他预订，请刷新后重试。", "IDEMPOTENCY_CONFLICT", 409);
        }
        const existingOrder = await tx.projectOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existingOrder) return { order: existingOrder, repeated: true };
        if (!existingKey) {
          await tx.commerceIdempotencyRecord.create({
            data: {
              scope: IDEMPOTENCY_SCOPE,
              key: input.idempotencyKey,
              requestHash: hash,
              status: CommerceIdempotencyStatus.PROCESSING,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          });
        }

        const project = await tx.collaborationProject.findFirst({
          where: { OR: [{ id: input.projectRef }, { slug: input.projectRef }] },
          include: {
            work: { select: { userId: true } },
            products: { where: { id: input.productId }, include: { skus: true }, take: 1 }
          }
        });
        const product = project?.products[0];
        if (!project || !product || !canViewProject(input.user, project) || !canOpenLimitedPreorder(project.status, product.status, project.designerAuthorizationStatus)) {
          throw new PreorderError("该项目暂不可预订。", "PREORDER_NOT_OPEN");
        }
        if (product.preorderDeadline && product.preorderDeadline <= new Date()) {
          throw new PreorderError("该商品预订已截止。", "PREORDER_CLOSED");
        }

        const sku = input.skuId ? product.skus.find((item) => item.id === input.skuId && item.enabled) : null;
        if (product.skus.some((item) => item.enabled) && !sku) {
          throw new PreorderError("请选择有效规格。", "SKU_REQUIRED");
        }

        const productReserved = await tx.projectOrder.aggregate({
          where: { productId: product.id, status: { in: [...ACTIVE_RESERVATION_STATUSES] } },
          _sum: { quantity: true }
        });
        if (product.targetQuantity !== null && product.targetQuantity !== undefined && (productReserved._sum.quantity ?? 0) + input.quantity > product.targetQuantity) {
          throw new PreorderError("该商品剩余名额不足。", "PRODUCT_CAPACITY_EXCEEDED", 409);
        }
        if (sku?.capacity !== null && sku?.capacity !== undefined) {
          const skuReserved = await tx.projectOrder.aggregate({
            where: { productId: product.id, skuId: sku.id, status: { in: [...ACTIVE_RESERVATION_STATUSES] } },
            _sum: { quantity: true }
          });
          if ((skuReserved._sum.quantity ?? 0) + input.quantity > sku.capacity) {
            throw new PreorderError("该规格剩余名额不足。", "CAPACITY_EXCEEDED", 409);
          }
        }
        const capacity = sku?.capacity ?? product.targetQuantity;
        const unitPrice = sku?.priceOverride ?? product.price;
        const totalAmount = calculateOrderTotal(unitPrice, input.quantity);
        const order = await tx.projectOrder.create({
          data: {
            projectId: project.id,
            workId: project.workId,
            productId: product.id,
            skuId: sku?.id ?? null,
            buyerId: input.user.id,
            title: product.title,
            quantity: input.quantity,
            unitPrice,
            totalAmount,
            currency: product.currency,
            status: ProjectOrderStatus.RESERVATION,
            paymentStatus: ProjectOrderPaymentStatus.UNPAID,
            buyerNote: input.buyerNote,
            note: "仅记录预订意向，未开启真实支付。",
            idempotencyKey: input.idempotencyKey,
            productSnapshot: {
              title: product.title,
              description: product.description,
              materialDescription: product.materialDescription,
              careInstructions: product.careInstructions,
              price: product.price,
              currency: product.currency
            },
            skuSnapshot: sku ? { id: sku.id, size: sku.size, color: sku.color, skuCode: sku.skuCode, priceOverride: sku.priceOverride } : Prisma.JsonNull,
            preorderDeadlineSnapshot: product.preorderDeadline,
            capacitySnapshot: capacity,
            termsVersion: TERMS_VERSION
          }
        });

        await tx.commerceStateEvent.create({
          data: {
            aggregateType: CommerceAggregateType.ORDER,
            aggregateId: order.id,
            toState: ProjectOrderStatus.RESERVATION,
            actorId: input.user.id,
            reason: "LIMITED_PREORDER_CREATED",
            metadata: { productId: product.id, skuId: sku?.id ?? null, quantity: input.quantity, termsVersion: TERMS_VERSION },
            idempotencyKey: input.idempotencyKey
          }
        });
        await tx.commerceIdempotencyRecord.update({
          where: { scope_key: { scope: IDEMPOTENCY_SCOPE, key: input.idempotencyKey } },
          data: { status: CommerceIdempotencyStatus.COMPLETED, responseCode: 201, responseBody: { orderId: order.id }, completedAt: new Date() }
        });
        return { order, repeated: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
  throw new PreorderError("预订冲突，请重试。", "TRANSACTION_CONFLICT", 409);
}
