import Link from "next/link";
import { LimitedPreorderQualificationMode, ProjectOrderConfirmationChannel, ProjectOrderFulfillmentStatus, ProjectOrderPaymentStatus, ProjectOrderStatus } from "@prisma/client";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { confirmLimitedPreorderOrder, updateProjectOrder } from "@/lib/projects/actions";
import { formatMoneyCents, PROJECT_ORDER_FULFILLMENT_STATUS_LABELS, PROJECT_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/projects/rules";
import { readProjectOrderProductSnapshot, readProjectOrderSkuSnapshot } from "@/lib/projects/order-snapshots";
import { prisma } from "@/lib/prisma";
import { maskUserContact } from "@/lib/user-contact";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const enabled = await isFeatureEnabled("feature.limited_preorder_v23");
  const orders = await prisma.projectOrder.findMany({
    where: { preorderCampaignId: { not: null } },
    include: {
      buyer: { select: { nickname: true, email: true, phone: true } },
      confirmedBy: { select: { nickname: true } },
      project: { select: { id: true, slug: true, title: true } },
      product: { select: { title: true } },
      sku: { select: { size: true, color: true } },
      preorderCampaign: { select: { title: true, preorderStatus: true, preorderQualificationMode: true, preorderDeadline: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";
  const now = new Date();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预订与订单管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">订单意向、付款与履约状态分开记录。真实支付、退款和物流未接入时，不得把人工状态当作支付渠道回执或退款成功证明。</p>
      </header>

      {!enabled ? (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Limited Preorder V2.3 新订单入口已关闭；已有订单仍可处理，避免功能开关阻断取消、退款或履约义务。</div>
      ) : null}
      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const productSnapshot = readProjectOrderProductSnapshot(order.productSnapshot);
            const skuSnapshot = readProjectOrderSkuSnapshot(order.skuSnapshot);
            const canVerify = enabled
              && order.preorderCampaign?.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER
              && (order.preorderCampaign.preorderStatus === "OPEN" || order.preorderCampaign.preorderStatus === "PAUSED")
              && Boolean(order.preorderCampaign.preorderDeadline && order.preorderCampaign.preorderDeadline > now)
              && Boolean(order.reservationExpiresAt && order.reservationExpiresAt > now)
              && order.paymentStatus === ProjectOrderPaymentStatus.UNPAID
              && ([ProjectOrderStatus.RESERVATION, ProjectOrderStatus.PENDING_PAYMENT] as readonly ProjectOrderStatus[]).includes(order.status);
            return (
            <article key={order.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <form action={updateProjectOrder} className="grid gap-3 lg:grid-cols-[1fr_170px_170px_170px_auto]">
              <input type="hidden" name="id" value={order.id} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-ink">{productSnapshot.title ?? order.title ?? order.product?.title}</h2>
                <p className="mt-1 text-sm text-ink/52">
                  <Link href={`/projects/${order.project.slug ?? order.project.id}`} className="underline">{order.project.title}</Link>
                  {" / "}
                  {(skuSnapshot.size || skuSnapshot.color) ? `${skuSnapshot.size ?? ""} ${skuSnapshot.color ?? ""}`.trim() : order.sku ? `${order.sku.size} ${order.sku.color}` : "规格待确认"}
                </p>
                <p className="mt-2 text-sm text-ink/58">{order.quantity} 件 / {formatMoneyCents(order.totalAmount, order.currency)} / {order.buyer ? maskUserContact(order.buyer) : "未关联用户"}</p>
                <p className="mt-1 text-xs text-ink/40">{order.preorderCampaign ? `${order.preorderCampaign.title} / ${order.preorderCampaign.preorderStatus} / 条款 ${order.termsVersion}${order.termsAcceptedAt ? "（已接受）" : "（未记录接受）"}` : "历史项目订单，未关联 V2.3 活动"}</p>
                {order.confirmedAt ? <p className="mt-1 text-xs font-semibold text-emerald-700">已核验：{order.confirmationChannel} · {order.confirmedBy?.nickname ?? order.confirmedById ?? "原核验人"} · {order.confirmedAt.toLocaleString("zh-CN")}</p> : null}
              </div>
              <select name="status" defaultValue={order.status} className={input}>
                {Object.values(ProjectOrderStatus)
                  .filter((status) => status !== ProjectOrderStatus.CONFIRMED || order.status === ProjectOrderStatus.CONFIRMED)
                  .map((status) => <option key={status} value={status}>{PROJECT_ORDER_STATUS_LABELS[status]}</option>)}
              </select>
              <select name="paymentStatus" defaultValue={order.paymentStatus} className={input}>
                {Array.from(new Set([
                  order.paymentStatus,
                  ProjectOrderPaymentStatus.FAILED,
                  ProjectOrderPaymentStatus.PARTIALLY_REFUNDED,
                  ProjectOrderPaymentStatus.REFUNDED
                ])).map((status) => <option key={status} value={status}>{PROJECT_ORDER_PAYMENT_STATUS_LABELS[status]}</option>)}
              </select>
              <select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className={input}>
                {Object.values(ProjectOrderFulfillmentStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[status]}</option>)}
              </select>
              <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
              <input name="trackingCompany" defaultValue={order.trackingCompany ?? ""} placeholder="物流公司，仅备注" className={input} />
              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} placeholder="物流单号，仅备注" className={input} />
              <input name="exceptionNote" defaultValue={order.exceptionNote ?? ""} placeholder="异常说明" className={`${input} lg:col-span-2`} />
              <input name="paymentReason" placeholder="本批禁止新增付款；失败或退款状态变更必须填写原因并有真实退款记录" className={`${input} lg:col-span-2`} />
              <input name="statusReason" placeholder="订单或履约状态变更原因，未变更可不填" className={`${input} lg:col-span-3`} />
              <input name="note" defaultValue={order.note ?? ""} placeholder="用户可见说明（会显示在订单详情）" className={`${input} lg:col-span-5`} />
            </form>
            {canVerify ? (
              <form action={confirmLimitedPreorderOrder} className="mt-4 grid gap-3 border-t border-black/8 pt-4 md:grid-cols-2">
                <input type="hidden" name="id" value={order.id} />
                <select name="confirmationChannel" required defaultValue="" className={input}>
                  <option value="" disabled>选择真实核验渠道</option>
                  {Object.values(ProjectOrderConfirmationChannel).map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                </select>
                <label className="grid gap-1 text-xs font-semibold text-ink/45">实际核验时间（UTC）<input name="confirmedAt" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className={input} /></label>
                <input name="confirmationEvidenceRef" required minLength={4} maxLength={200} placeholder="外部工单/沟通记录编号（不填联系方式）" className={input} />
                <textarea name="confirmationSummary" required minLength={10} maxLength={500} placeholder="核验摘要：确认了哪些商品、规格和数量；不得粘贴完整手机号、微信号等敏感信息" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
                <button className="h-11 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white md:col-span-2">人工核验并计入成团</button>
              </form>
            ) : null}
            {order.confirmedAt ? (
              <div className="mt-4 rounded-[6px] bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                证据编号：{order.confirmationEvidenceRef} · 摘要：{order.confirmationSummary}
              </div>
            ) : null}
            </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预订或订单记录。</div>
      )}
    </div>
  );
}
