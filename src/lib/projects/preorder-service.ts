import { createHash } from "node:crypto";
import {
  CommerceAggregateType,
  CommerceIdempotencyStatus,
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus,
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
import { isPublicQualityWork } from "@/lib/works/rules";

const IDEMPOTENCY_SCOPE = "limited-preorder:create";
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
  termsAccepted: boolean;
};

function requestHash(input: CreatePreorderInput) {
  return createHash("sha256").update(JSON.stringify({
    userId: input.user.id,
    projectRef: input.projectRef,
    productId: input.productId,
    skuId: input.skuId,
    quantity: input.quantity,
    buyerNote: input.buyerNote,
    termsAccepted: input.termsAccepted
  })).digest("hex");
}

export async function createLimitedPreorder(input: CreatePreorderInput) {
  if (!input.termsAccepted) throw new PreorderError("请先阅读并同意限量预售说明。", "TERMS_NOT_ACCEPTED");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) {
    throw new PreorderError("预订数量必须是 1 至 20 的整数。", "INVALID_QUANTITY");
  }
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
            work: {
              select: {
                userId: true,
                title: true,
                description: true,
                reviewStatus: true,
                contentStatus: true,
                visibility: true,
                images: { select: { imageUrl: true } }
              }
            },
            presaleCampaign: true,
            products: { where: { id: input.productId }, include: { skus: true }, take: 1 }
          }
        });
        const product = project?.products[0];
        const campaign = project?.presaleCampaign;
        if (
          !project
          || !campaign
          || !product
          || !project.work
          || !isPublicQualityWork(project.work)
          || product.preorderCampaignId !== campaign.id
          || campaign.preorderStatus !== LimitedPreorderStatus.OPEN
          || !canViewProject(input.user, project)
          || !canOpenLimitedPreorder(project.status, product.status, project.designerAuthorizationStatus)
        ) {
          throw new PreorderError("该项目暂不可预订。", "PREORDER_NOT_OPEN");
        }
        if (campaign.preorderQualificationMode === LimitedPreorderQualificationMode.PAID_ORDER) {
          throw new PreorderError("按付款成团尚未具备真实退款记录闭环，本期不能接受新的付款预订。", "PAYMENT_MODE_NOT_AVAILABLE", 409);
        }
        const now = new Date();
        if (!campaign.preorderDeadline || campaign.preorderDeadline <= now || !product.preorderDeadline || product.preorderDeadline <= now) {
          throw new PreorderError("该商品预订已截止。", "PREORDER_CLOSED");
        }

        const sku = input.skuId ? product.skus.find((item) => item.id === input.skuId && item.enabled) : null;
        if (product.skus.some((item) => item.enabled) && !sku) {
          throw new PreorderError("请选择有效规格。", "SKU_REQUIRED");
        }

        const expiringStatuses: readonly ProjectOrderStatus[] = [
          ProjectOrderStatus.RESERVATION,
          ProjectOrderStatus.PENDING_PAYMENT
        ];
        const durableCapacityStatuses = ACTIVE_RESERVATION_STATUSES.filter((status) => !expiringStatuses.includes(status));
        const activeReservationWhere = {
          OR: [
            { status: { in: durableCapacityStatuses } },
            {
              paymentStatus: { in: [ProjectOrderPaymentStatus.PAID, ProjectOrderPaymentStatus.PARTIALLY_REFUNDED] }
            },
            {
              status: { in: [ProjectOrderStatus.RESERVATION, ProjectOrderStatus.PENDING_PAYMENT] },
              paymentStatus: { notIn: [ProjectOrderPaymentStatus.PAID, ProjectOrderPaymentStatus.PARTIALLY_REFUNDED] },
              OR: [{ reservationExpiresAt: null }, { reservationExpiresAt: { gt: now } }]
            }
          ]
        } satisfies Prisma.ProjectOrderWhereInput;
        const existingBuyerOrder = await tx.projectOrder.findFirst({
          where: {
            preorderCampaignId: campaign.id,
            buyerId: input.user.id,
            productId: product.id,
            skuId: sku?.id ?? null,
            ...activeReservationWhere
          }
        });
        if (existingBuyerOrder) {
          throw new PreorderError("你已提交过该商品与规格的有效订单意向；当前没有自助修改入口，请联系 RunwayLab 平台或管理员核对并处理原记录。", "ACTIVE_ORDER_EXISTS", 409);
        }

        const productReserved = await tx.projectOrder.aggregate({
          where: { preorderCampaignId: campaign.id, productId: product.id, ...activeReservationWhere },
          _sum: { quantity: true }
        });
        if (!product.preorderLimit || (productReserved._sum.quantity ?? 0) + input.quantity > product.preorderLimit) {
          throw new PreorderError("该商品剩余名额不足。", "PRODUCT_CAPACITY_EXCEEDED", 409);
        }
        const campaignReserved = await tx.projectOrder.aggregate({
          where: { preorderCampaignId: campaign.id, ...activeReservationWhere },
          _sum: { quantity: true }
        });
        if (!campaign.preorderCapacity || (campaignReserved._sum.quantity ?? 0) + input.quantity > campaign.preorderCapacity) {
          throw new PreorderError("本期预售剩余名额不足。", "CAMPAIGN_CAPACITY_EXCEEDED", 409);
        }
        if (sku?.capacity !== null && sku?.capacity !== undefined) {
          const skuReserved = await tx.projectOrder.aggregate({
            where: { preorderCampaignId: campaign.id, productId: product.id, skuId: sku.id, ...activeReservationWhere },
            _sum: { quantity: true }
          });
          if ((skuReserved._sum.quantity ?? 0) + input.quantity > sku.capacity) {
            throw new PreorderError("该规格剩余名额不足。", "CAPACITY_EXCEEDED", 409);
          }
        }
        const capacity = sku?.capacity ?? product.preorderLimit;
        const unitPrice = sku?.priceOverride ?? product.price;
        if (!Number.isInteger(unitPrice) || unitPrice <= 0) throw new PreorderError("该规格价格配置无效，暂不可预订。", "INVALID_SKU_PRICE");
        if (!campaign.preorderTermsText || campaign.preorderTermsText.trim().length < 40) {
          throw new PreorderError("本期预售条款尚未完整锁定，暂不可预订。", "TERMS_NOT_CONFIGURED");
        }
        const totalAmount = calculateOrderTotal(unitPrice, input.quantity);
        const reservationExpiresAt = campaign.preorderDeadline;
        const order = await tx.projectOrder.create({
          data: {
            projectId: project.id,
            preorderCampaignId: campaign.id,
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
            note: "仅记录真实订单意向，未开启在线收款。",
            idempotencyKey: input.idempotencyKey,
            productSnapshot: {
              title: product.title,
              description: product.description,
              materialDescription: product.materialDescription,
              careInstructions: product.careInstructions,
              price: product.price,
              currency: product.currency,
              preorderLimit: product.preorderLimit,
              campaignId: campaign.id,
              qualificationMode: campaign.preorderQualificationMode,
              campaignTargetQuantity: campaign.preorderTargetQuantity,
              campaignCapacity: campaign.preorderCapacity
            },
            skuSnapshot: sku ? { id: sku.id, size: sku.size, color: sku.color, skuCode: sku.skuCode, priceOverride: sku.priceOverride } : Prisma.JsonNull,
            preorderDeadlineSnapshot: product.preorderDeadline,
            estimatedShipDate: product.estimatedShipDate,
            capacitySnapshot: capacity,
            termsVersion: campaign.preorderTermsVersion,
            termsTextSnapshot: campaign.preorderTermsText,
            paymentInstructionsSnapshot: campaign.preorderPaymentInstructions,
            termsAcceptedAt: now,
            reservationExpiresAt
          }
        });

        await tx.commerceStateEvent.create({
          data: {
            aggregateType: CommerceAggregateType.ORDER,
            aggregateId: order.id,
            toState: ProjectOrderStatus.RESERVATION,
            actorId: input.user.id,
            reason: "LIMITED_PREORDER_CREATED",
            metadata: {
              campaignId: campaign.id,
              productId: product.id,
              skuId: sku?.id ?? null,
              quantity: input.quantity,
              termsVersion: campaign.preorderTermsVersion,
              termsTextHash: createHash("sha256").update(campaign.preorderTermsText).digest("hex"),
              termsAcceptedAt: now.toISOString(),
              reservationExpiresAt: reservationExpiresAt.toISOString()
            },
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
