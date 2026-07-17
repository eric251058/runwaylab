import { NextResponse } from "next/server";
import { ProjectOrderPaymentStatus, ProjectOrderStatus, ProjectProductStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/features";
import { createPaymentProvider } from "@/lib/payments/provider";
import { calculateOrderTotal, canOpenLimitedPreorder, canViewProject } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveQuantity(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 20 ? number : 1;
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.limited_preorder_v23"))) {
    return NextResponse.json({ error: "限量预订功能尚未开放。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit(`limited-preorder:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return NextResponse.json({ error: "提交太频繁，请稍后再试。" }, { status: 429 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = text(body?.productId, 80);
  if (!productId) return NextResponse.json({ error: "请选择预订商品。" }, { status: 400 });

  const project = await prisma.collaborationProject.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      work: { select: { id: true, userId: true, title: true } },
      products: {
        where: { id: productId },
        include: { skus: true },
        take: 1
      }
    }
  });

  const product = project?.products[0];
  if (!project || !product || !canViewProject(user, project) || !canOpenLimitedPreorder(project.status, product.status, project.designerAuthorizationStatus)) {
    return NextResponse.json({ error: "该项目暂不可预订。" }, { status: 400 });
  }

  const skuId = text(body?.skuId, 80) || null;
  const sku = skuId ? product.skus.find((item) => item.id === skuId && item.enabled) : null;
  if (skuId && !sku) return NextResponse.json({ error: "所选规格不可用。" }, { status: 400 });

  const quantity = positiveQuantity(body?.quantity);
  const unitPrice = sku?.priceOverride ?? product.price;
  const totalAmount = calculateOrderTotal(unitPrice, quantity);

  const flags = await getFeatureFlags();
  const paymentProvider = createPaymentProvider(flags);
  const payment = await paymentProvider.createPayment({
    orderId: "pending",
    amountCents: totalAmount,
    currency: product.currency,
    description: product.title
  });

  const order = await prisma.projectOrder.create({
    data: {
      projectId: project.id,
      workId: project.workId,
      productId: product.id,
      skuId: sku?.id ?? null,
      buyerId: user.id,
      title: product.title,
      quantity,
      unitPrice,
      totalAmount,
      currency: product.currency,
      status: ProjectOrderStatus.RESERVATION,
      paymentStatus: payment.ok ? ProjectOrderPaymentStatus.PENDING : ProjectOrderPaymentStatus.UNPAID,
      buyerNote: text(body?.buyerNote, 500) || null,
      note: payment.ok ? payment.message : "仅记录预订意向，未开启真实支付。"
    }
  });

  return NextResponse.json({ order, payment });
}
