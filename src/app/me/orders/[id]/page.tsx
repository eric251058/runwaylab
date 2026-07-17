import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { formatMoneyCents, PROJECT_ORDER_FULFILLMENT_STATUS_LABELS, PROJECT_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeOrderDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/orders");

  const enabled = await isFeatureEnabled("feature.limited_preorder_v23");
  if (!enabled) notFound();

  const { id } = await params;
  const order = await prisma.projectOrder.findFirst({
    where: { id, buyerId: user.id },
    include: {
      project: { select: { id: true, slug: true, title: true } },
      work: { select: { id: true, title: true } },
      product: { select: { title: true, description: true } },
      sku: { select: { size: true, color: true } }
    }
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/me/orders" className="text-sm font-semibold text-ink/52 hover:text-ink">返回预订意向</Link>
      <article className="mt-4 rounded-[8px] border border-black/8 bg-white p-5">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_ORDER_STATUS_LABELS[order.status]}</span>
        <h1 className="mt-4 text-3xl font-semibold text-ink md:text-5xl">{order.product?.title ?? order.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">{order.product?.description ?? "该记录为预订意向，不代表已支付订单。"}</p>

        <div className="mt-5 grid gap-3 text-sm text-ink/58 md:grid-cols-2">
          <p className="rounded-[6px] bg-paper p-3">项目：{order.project.title}</p>
          <p className="rounded-[6px] bg-paper p-3">作品：{order.work?.title ?? "待关联"}</p>
          <p className="rounded-[6px] bg-paper p-3">规格：{order.sku ? `${order.sku.size} / ${order.sku.color}` : "待确认"}</p>
          <p className="rounded-[6px] bg-paper p-3">数量：{order.quantity}</p>
          <p className="rounded-[6px] bg-paper p-3">金额：{formatMoneyCents(order.totalAmount, order.currency)}</p>
          <p className="rounded-[6px] bg-paper p-3">支付：{PROJECT_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          <p className="rounded-[6px] bg-paper p-3">履约：{PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}</p>
          <p className="rounded-[6px] bg-paper p-3">发货：{[order.trackingCompany, order.trackingNumber].filter(Boolean).join(" / ") || "待更新"}</p>
        </div>

        <p className="mt-5 rounded-[6px] border border-black/8 bg-paper p-3 text-sm leading-6 text-ink/55">
          {order.note ?? "RunwayLab 当前不处理真实支付、退款或物流，后续由平台人工确认。"}
        </p>
      </article>
    </div>
  );
}
