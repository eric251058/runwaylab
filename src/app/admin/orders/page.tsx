import Link from "next/link";
import { LimitedPreorderQualificationMode, ProjectOrderConfirmationChannel, ProjectOrderFulfillmentStatus, ProjectOrderPaymentStatus, ProjectOrderStatus } from "@prisma/client";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { AdminRefundForm } from "@/components/payments/AdminRefundForm";
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
      preorderCampaign: { select: { title: true, preorderStatus: true, preorderQualificationMode: true, preorderDeadline: true } },
      paymentAttempts: {
        where: { provider: "alipay" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amount: true,
          providerAttemptId: true,
          failureCode: true,
          failureMessage: true,
          createdAt: true,
          capturedAt: true
        }
      },
      refunds: {
        where: { provider: "alipay" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amount: true,
          reason: true,
          providerRefundId: true,
          failureCode: true,
          failureMessage: true,
          createdAt: true,
          completedAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";
  const now = new Date();
  const paymentReviewOrderCount = orders.filter((order) => (
    order.paymentAttempts.some((attempt) => (
      attempt.status === "FAILED"
      || (attempt.status === "PROCESSING" && attempt.createdAt.getTime() < now.getTime() - 30 * 60 * 1000)
    ))
    || order.refunds.some((refund) => refund.status === "PROCESSING" || refund.status === "FAILED")
  )).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预订与订单管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">订单、付款、退款与履约状态分开记录。线上付款和原路退款只以支付渠道服务器回执为准；人工记录不能冒充渠道回执。</p>
      </header>

      {!enabled ? (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Limited Preorder V2.3 新订单入口已关闭；已有订单仍可处理，避免功能开关阻断取消、退款或履约义务。</div>
      ) : null}
      {paymentReviewOrderCount > 0 ? (
        <div className="mb-5 rounded-[8px] border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          有 {paymentReviewOrderCount} 笔订单包含失败支付、超过 30 分钟的处理中支付或待复核退款。请结合支付宝商户账单核对，未知结果必须沿用原幂等编号处理。
        </div>
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
            const capturedAttempt = order.paymentAttempts.find((attempt) => attempt.status === "CAPTURED");
            const succeededRefundCents = order.refunds
              .filter((refund) => refund.status === "SUCCEEDED")
              .reduce((sum, refund) => sum + refund.amount, 0);
            const refundableCents = Math.max(0, (capturedAttempt?.amount ?? 0) - succeededRefundCents);
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
            {order.paymentAttempts.length ? (
              <div className="mt-3 rounded-[6px] border border-black/8 bg-paper p-3 text-xs leading-5 text-ink/55">
                <p className="font-semibold text-ink">线上支付尝试</p>
                {order.paymentAttempts.map((attempt) => (
                  <p key={attempt.id} className="mt-1">
                    {attempt.status} · ¥{(attempt.amount / 100).toFixed(2)} · {attempt.createdAt.toLocaleString("zh-CN")}
                    {attempt.providerAttemptId ? ` · 渠道流水 ${attempt.providerAttemptId}` : ""}
                    {attempt.failureCode ? ` · ${attempt.failureCode}` : ""}
                    {attempt.failureMessage ? ` · ${attempt.failureMessage}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
            {refundableCents > 0 ? <AdminRefundForm orderId={order.id} refundableCents={refundableCents} /> : null}
            {order.refunds.length ? (
              <div className="mt-3 rounded-[6px] border border-black/8 bg-paper p-3 text-xs leading-5 text-ink/55">
                <p className="font-semibold text-ink">线上退款记录</p>
                {order.refunds.map((refund) => (
                  <p key={refund.id} className="mt-1">{refund.status} · ¥{(refund.amount / 100).toFixed(2)} · {refund.reason ?? "未填写原因"}{refund.failureMessage ? ` · ${refund.failureMessage}` : ""}</p>
                ))}
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
