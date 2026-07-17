import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { formatMoneyCents, PROJECT_ORDER_FULFILLMENT_STATUS_LABELS, PROJECT_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/orders");

  const enabled = await isFeatureEnabled("feature.limited_preorder_v23");
  const orders = enabled
    ? await prisma.projectOrder.findMany({
        where: { buyerId: user.id },
        include: {
          project: { select: { title: true, slug: true } },
          product: { select: { title: true } },
          sku: { select: { size: true, color: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 80
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Orders</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">我的预订意向</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">当前仅展示限量预订和合作意向，不代表已完成真实支付。</p>
      </header>

      {!enabled ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">限量预订功能尚未开放。</div>
      ) : orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/me/orders/${order.id}`} className="block rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-ink">{order.product?.title ?? order.title}</h2>
                  <p className="mt-1 text-sm text-ink/52">{order.project.title} / {order.sku ? `${order.sku.size} ${order.sku.color}` : "规格待确认"}</p>
                </div>
                <span className="w-fit rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROJECT_ORDER_STATUS_LABELS[order.status]}</span>
              </div>
              <p className="mt-3 text-sm text-ink/58">
                {order.quantity} 件 / {formatMoneyCents(order.totalAmount, order.currency)} / {PROJECT_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus]} / {PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预订意向。</div>
      )}
    </div>
  );
}
