import Link from "next/link";
import { ProjectOrderFulfillmentStatus, ProjectOrderPaymentStatus, ProjectOrderStatus } from "@prisma/client";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { updateProjectOrder } from "@/lib/projects/actions";
import { formatMoneyCents, PROJECT_ORDER_FULFILLMENT_STATUS_LABELS, PROJECT_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { maskUserContact } from "@/lib/user-contact";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const enabled = await isFeatureEnabled("feature.limited_preorder_v23");
  const orders = enabled
    ? await prisma.projectOrder.findMany({
        include: {
          buyer: { select: { nickname: true, email: true, phone: true } },
          project: { select: { id: true, slug: true, title: true } },
          product: { select: { title: true } },
          sku: { select: { size: true, color: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 200
      })
    : [];

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预订与订单管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">当前只处理限量预订意向和人工状态，不接入真实支付、退款或物流。</p>
      </header>

      {!enabled ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">Limited Preorder V2.3 功能开关未开启。</div>
      ) : orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <form key={order.id} action={updateProjectOrder} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 lg:grid-cols-[1fr_170px_170px_170px_auto]">
              <input type="hidden" name="id" value={order.id} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-ink">{order.product?.title ?? order.title}</h2>
                <p className="mt-1 text-sm text-ink/52">
                  <Link href={`/projects/${order.project.slug ?? order.project.id}`} className="underline">{order.project.title}</Link>
                  {" / "}
                  {order.sku ? `${order.sku.size} ${order.sku.color}` : "规格待确认"}
                </p>
                <p className="mt-2 text-sm text-ink/58">{order.quantity} 件 / {formatMoneyCents(order.totalAmount, order.currency)} / {order.buyer ? maskUserContact(order.buyer) : "未关联用户"}</p>
              </div>
              <select name="status" defaultValue={order.status} className={input}>
                {Object.values(ProjectOrderStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_STATUS_LABELS[status]}</option>)}
              </select>
              <select name="paymentStatus" defaultValue={order.paymentStatus} className={input}>
                {Object.values(ProjectOrderPaymentStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_PAYMENT_STATUS_LABELS[status]}</option>)}
              </select>
              <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className={input}>
                {Object.values(ProjectOrderFulfillmentStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[status]}</option>)}
              </select>
              <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
              <input name="trackingCompany" defaultValue={order.trackingCompany ?? ""} placeholder="物流公司，仅备注" className={input} />
              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} placeholder="物流单号，仅备注" className={input} />
              <input name="exceptionNote" defaultValue={order.exceptionNote ?? ""} placeholder="异常说明" className={`${input} lg:col-span-2`} />
              <input name="paymentReason" placeholder="付款状态变更原因，未变更可不填" className={`${input} lg:col-span-2`} />
              <input name="note" defaultValue={order.note ?? ""} placeholder="内部备注" className={`${input} lg:col-span-5`} />
            </form>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预订或订单记录。</div>
      )}
    </div>
  );
}
