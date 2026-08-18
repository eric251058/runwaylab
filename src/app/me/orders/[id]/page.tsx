import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LimitedPreorderQualificationMode, LimitedPreorderStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { isFeatureEnabled } from "@/lib/features";
import { LIMITED_PREORDER_QUALIFICATION_LABELS, LIMITED_PREORDER_STATUS_LABELS } from "@/lib/projects/preorder-lifecycle";
import { formatMoneyCents, PROJECT_ORDER_FULFILLMENT_STATUS_LABELS, PROJECT_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/projects/rules";
import { readProjectOrderProductSnapshot, readProjectOrderSkuSnapshot } from "@/lib/projects/order-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(value);
}

function limitedPreorderOrderNotice(status: LimitedPreorderStatus, mode: LimitedPreorderQualificationMode) {
  const noPayment = mode === LimitedPreorderQualificationMode.CONFIRMED_ORDER;
  switch (status) {
    case LimitedPreorderStatus.OPEN:
      return noPayment
        ? "活动仍在接收订单意向；本期不收款，本笔记录只有在平台完成结构化人工核验后才计入成团。"
        : "活动仍在接单；本笔订单是否计入成团，以订单确认及付款状态为准。";
    case LimitedPreorderStatus.PAUSED:
      return "活动已暂停接单，本笔订单记录仍保留并等待平台后续处理。";
    case LimitedPreorderStatus.GOAL_REACHED:
      return "活动已达到成团目标，正在等待平台确认进入生产。";
    case LimitedPreorderStatus.FAILED:
      return noPayment ? "活动未达到成团目标，本笔未付款订单意向将关闭。" : "活动未达到成团目标。已付款订单应进入退款待处理，退款完成以实际退款记录为准。";
    case LimitedPreorderStatus.CANCELLED:
      return noPayment ? "活动已取消，本笔未付款订单意向将关闭。" : "活动已取消。已付款订单应进入退款待处理，退款完成以实际退款记录为准。";
    case LimitedPreorderStatus.PRODUCTION:
      return "活动已进入生产，生产、质检和发货进度以本笔订单状态为准。";
    case LimitedPreorderStatus.CLOSED:
      return noPayment
        ? "活动已结束归档，本笔未付款订单意向的核验、状态和履约记录仍然保留。"
        : "活动已结束归档，本笔历史订单及其付款、退款和履约记录仍然保留。";
    case LimitedPreorderStatus.NOT_STARTED:
      return "活动尚未开始。";
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MeOrderDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/orders");

  const enabled = await isFeatureEnabled("feature.limited_preorder_v23");

  const { id } = await params;
  const order = await prisma.projectOrder.findFirst({
    where: { id, buyerId: user.id, preorderCampaignId: { not: null } },
    include: {
      project: { select: { id: true, slug: true, title: true } },
      work: { select: { id: true, title: true } },
      product: { select: { title: true, description: true } },
      sku: { select: { size: true, color: true } },
      preorderCampaign: {
        select: {
          title: true,
          preorderStatus: true,
          preorderDeadline: true,
          preorderTargetQuantity: true,
          preorderQualificationMode: true,
          preorderPublicNotice: true
        }
      }
    }
  });

  if (!order) notFound();
  const productSnapshot = readProjectOrderProductSnapshot(order.productSnapshot);
  const skuSnapshot = readProjectOrderSkuSnapshot(order.skuSnapshot);
  const noPaymentOrder = order.preorderCampaign?.preorderQualificationMode === LimitedPreorderQualificationMode.CONFIRMED_ORDER;
  const reservationExpiry = order.reservationExpiresAt
    ? `${order.reservationExpiresAt.getTime() > Date.now() ? "名额锁定至" : "名额锁定已于"} ${formatDateTime(order.reservationExpiresAt)}${order.reservationExpiresAt.getTime() > Date.now() ? "" : " 到期"}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/me/orders" className="text-sm font-semibold text-ink/52 hover:text-ink">返回预订意向</Link>
      {!enabled ? <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">限量预售的新提交入口当前已关闭；这笔历史订单意向及其核验、状态和履约记录仍然有效并继续展示。</div> : null}
      <article className="mt-4 rounded-[8px] border border-black/8 bg-white p-5">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_ORDER_STATUS_LABELS[order.status]}</span>
        <h1 className="mt-4 text-3xl font-semibold text-ink md:text-5xl">{productSnapshot.title ?? order.title ?? order.product?.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">{productSnapshot.description ?? order.product?.description ?? "该记录为预订意向，不代表已支付订单。"}</p>
        {productSnapshot.displayImageUrls[0] ? <img src={productSnapshot.displayImageUrls[0]} alt={productSnapshot.title ?? order.title ?? "下单时展示图片"} className="mt-4 aspect-[4/3] w-full rounded-[8px] object-cover" /> : null}
        {productSnapshot.imageStage ? <p className="mt-2 text-xs text-ink/45">下单时图片阶段：{productSnapshot.imageStage}</p> : null}

        {order.preorderCampaign ? (
          <section className="mt-5 rounded-[8px] border border-black/8 bg-paper p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs text-ink/40">下单时活动</p><p className="mt-1 font-semibold text-ink">{productSnapshot.campaignTitle ?? order.preorderCampaign.title}</p></div>
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{LIMITED_PREORDER_STATUS_LABELS[order.preorderCampaign.preorderStatus]}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-ink/58 sm:grid-cols-3">
              <p>成团目标：{order.preorderCampaign.preorderTargetQuantity !== null ? `${order.preorderCampaign.preorderTargetQuantity} 件` : "未记录"}</p>
              <p>成团口径：{LIMITED_PREORDER_QUALIFICATION_LABELS[order.preorderCampaign.preorderQualificationMode]}</p>
              <p>活动截止：{order.preorderCampaign.preorderDeadline ? formatDateTime(order.preorderCampaign.preorderDeadline) : "未记录"}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/58">{limitedPreorderOrderNotice(order.preorderCampaign.preorderStatus, order.preorderCampaign.preorderQualificationMode)}</p>
            {order.preorderCampaign.preorderPublicNotice ? <p className="mt-2 text-sm leading-6 text-ink/58"><span className="font-semibold text-ink">平台状态说明：</span>{order.preorderCampaign.preorderPublicNotice}</p> : null}
          </section>
        ) : null}

        <div className="mt-5 grid gap-3 text-sm text-ink/58 md:grid-cols-2">
          <p className="rounded-[6px] bg-paper p-3">项目：{productSnapshot.projectTitle ?? order.project.title}</p>
          <p className="rounded-[6px] bg-paper p-3">作品：{productSnapshot.workTitle ?? order.work?.title ?? "待关联"}</p>
          <p className="rounded-[6px] bg-paper p-3">规格：{(skuSnapshot.size || skuSnapshot.color) ? `${skuSnapshot.size ?? ""} / ${skuSnapshot.color ?? ""}` : order.sku ? `${order.sku.size} / ${order.sku.color}` : "待确认"}</p>
          <p className="rounded-[6px] bg-paper p-3">数量：{order.quantity}</p>
          <p className="rounded-[6px] bg-paper p-3">{noPaymentOrder ? "参考金额（未收款）" : "金额"}：{formatMoneyCents(order.totalAmount, order.currency)}</p>
          <p className="rounded-[6px] bg-paper p-3">支付：{PROJECT_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          <p className="rounded-[6px] bg-paper p-3">履约：{PROJECT_ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}</p>
          <p className="rounded-[6px] bg-paper p-3">发货：{[order.trackingCompany, order.trackingNumber].filter(Boolean).join(" / ") || "待更新"}</p>
          <p className="rounded-[6px] bg-paper p-3">预售截止：{order.preorderDeadlineSnapshot ? formatDateTime(order.preorderDeadlineSnapshot) : "未记录"}</p>
          <p className="rounded-[6px] bg-paper p-3">预计发货：{order.estimatedShipDate ? formatDateTime(order.estimatedShipDate) : "待更新"}</p>
          <p className="rounded-[6px] bg-paper p-3">条款版本：{order.termsVersion}{order.termsAcceptedAt ? ` / 接受于 ${formatDateTime(order.termsAcceptedAt)}` : " / 未记录接受时间"}</p>
        </div>

        {reservationExpiry ? <p className="mt-4 rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">{reservationExpiry}</p> : null}
        {order.confirmedAt ? (
          <div className="mt-4 rounded-[6px] border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
            <p className="font-semibold">平台已人工核验这笔真实订单意向</p>
            <p className="mt-1">核验时间：{formatDateTime(order.confirmedAt)} · 渠道：{order.confirmationChannel ?? "已记录"}</p>
            {order.confirmationSummary ? <p className="mt-1">核验摘要：{order.confirmationSummary}</p> : null}
            <p className="mt-1 text-xs">本批不收款；“已核验”仅表示计入成团口径，不代表已付款或已有现货。</p>
          </div>
        ) : null}
        {order.cancellationReason ? <p className="mt-4 rounded-[6px] border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-950">取消或失败原因：{order.cancellationReason}</p> : null}

        {order.termsTextSnapshot ? (
          <div className="mt-4 rounded-[6px] border border-black/8 bg-paper p-3 text-sm leading-6 text-ink/58">
            <p className="font-semibold text-ink">下单时接受的限量预售条款正文</p>
            <p className="mt-2 whitespace-pre-line">{order.termsTextSnapshot}</p>
          </div>
        ) : null}
        {order.preorderCampaign?.preorderQualificationMode === "PAID_ORDER" && order.paymentInstructionsSnapshot ? (
          <div className="mt-4 rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <p className="font-semibold">下单时适用的人工付款指引</p>
            <p className="mt-2 whitespace-pre-line">{order.paymentInstructionsSnapshot}</p>
          </div>
        ) : null}

        <p className="mt-5 rounded-[6px] border border-black/8 bg-paper p-3 text-sm leading-6 text-ink/55">
          {order.note ?? "RunwayLab 当前不处理真实支付、退款或物流，后续由平台人工确认。"}
        </p>
      </article>
    </div>
  );
}
