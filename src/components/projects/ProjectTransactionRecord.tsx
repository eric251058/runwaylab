"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PaymentAttempt = {
  id: string;
  providerAttemptId: string | null;
  amount: number;
  currency: string;
  status: string;
  capturedAt: string | null;
  createdAt: string;
};

export type PrivateProjectOrder = {
  id: string;
  title: string;
  quantity: number;
  quantityNote: string | null;
  amountNote: string | null;
  deliveryNote: string | null;
  totalAmount: number | null;
  currency: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingCompany: string | null;
  trackingNumber: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentAttempts: PaymentAttempt[];
};

type Props = {
  projectId: string;
  order: PrivateProjectOrder | null;
  canBuyerAct: boolean;
  canProviderAct: boolean;
};

const paymentLabels: Record<string, string> = {
  UNPAID: "未提交付款凭证",
  PENDING: "待服务商确认到账",
  PAID: "服务商已确认到账",
  FAILED: "付款凭证未通过",
  REFUNDED: "已退款",
  PARTIALLY_REFUNDED: "部分退款"
};

const fulfillmentLabels: Record<string, string> = {
  NOT_STARTED: "待开始",
  PRODUCTION: "履约中",
  QUALITY_CHECK: "质检中",
  READY_TO_SHIP: "待交付",
  SHIPPED: "运输中",
  DELIVERED: "待验收",
  EXCEPTION: "异常"
};

function money(amount: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency
  }).format(amount / 100);
}

export function ProjectTransactionRecord({ projectId, order, canBuyerAct, canProviderAct }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentRejectionReason, setPaymentRejectionReason] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  async function act(payload: Record<string, unknown>, confirmation?: string) {
    if (!order || (confirmation && !window.confirm(confirmation))) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(
        "/api/me/projects/collaboration/" + projectId + "/order/" + order.id + "/action",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json().catch(() => ({ message: "操作失败，请稍后重试。" }));
      setMessage(result.message ?? (response.ok ? "已更新。" : "操作失败。"));
      if (response.ok) router.refresh();
    });
  }

  if (!order) {
    return (
      <section className="rounded-[8px] border border-dashed border-black/12 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Transaction Record</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">合作订单</h2>
        <p className="mt-2 text-sm leading-6 text-ink/52">
          合作方案确认后，系统会自动生成双方可追踪的订单、付款留痕和交付验收记录。
        </p>
      </section>
    );
  }

  const pendingAttempt = order.paymentAttempts.find((attempt) => attempt.status === "PROCESSING");
  const capturedAttempt = order.paymentAttempts.find((attempt) => attempt.status === "CAPTURED");
  const isCompleted = order.status === "COMPLETED";

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(16,16,16,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Transaction Record</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">合作订单与履约</h2>
          <p className="mt-2 text-sm leading-6 text-ink/52">
            平台只记录双方确认事实，不代收资金，也不替任何一方判断线下凭证真伪。
          </p>
        </div>
        <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + (isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-ink text-white")}>
          {isCompleted ? "已完成" : "执行中"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[8px] bg-paper p-4">
          <p className="text-xs font-semibold text-ink/38">付款状态</p>
          <p className="mt-1 font-semibold text-ink">{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</p>
          {capturedAttempt ? <p className="mt-1 text-sm text-ink/52">已确认 {money(capturedAttempt.amount, capturedAttempt.currency)}</p> : null}
        </div>
        <div className="rounded-[8px] bg-paper p-4">
          <p className="text-xs font-semibold text-ink/38">交付状态</p>
          <p className="mt-1 font-semibold text-ink">{isCompleted ? "项目方已验收" : (fulfillmentLabels[order.fulfillmentStatus] ?? order.fulfillmentStatus)}</p>
          {order.trackingNumber ? <p className="mt-1 break-all text-sm text-ink/52">{order.trackingCompany} · {order.trackingNumber}</p> : null}
        </div>
      </div>

      <div className="mt-4 rounded-[8px] border border-black/8 p-4 text-sm leading-6 text-ink/60">
        <p className="font-semibold text-ink">{order.title}</p>
        <p className="mt-1">{[order.amountNote, order.quantityNote, order.deliveryNote].filter(Boolean).join(" · ")}</p>
      </div>

      {canBuyerAct && ["UNPAID", "FAILED"].includes(order.paymentStatus) && !isCompleted ? (
        <div className="mt-5 border-t border-black/8 pt-5">
          <h3 className="font-semibold text-ink">提交线下付款凭证</h3>
          <p className="mt-1 text-xs leading-5 text-ink/45">提交后只显示“待确认”，服务商确认到账后才会显示已付款。</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="付款金额（CNY）" className="rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
            <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="银行流水号 / 凭证编号" className="rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
          </div>
          <textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="付款说明（选填）" className="mt-3 min-h-20 w-full rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
          <button disabled={pending || !amount.trim() || !paymentReference.trim()} onClick={() => act({ action: "SUBMIT_PAYMENT_EVIDENCE", amount, reference: paymentReference, note: paymentNote || undefined }, "确认提交这份线下付款凭证？提交后需由服务商确认到账。")} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            提交付款凭证
          </button>
        </div>
      ) : null}

      {canProviderAct && order.paymentStatus === "PENDING" && pendingAttempt ? (
        <div className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">项目方申报付款 {money(pendingAttempt.amount, pendingAttempt.currency)}</p>
          <p className="mt-1 break-all text-sm text-amber-900/70">凭证编号：{pendingAttempt.providerAttemptId}</p>
          <input value={paymentRejectionReason} onChange={(event) => setPaymentRejectionReason(event.target.value)} placeholder="未到账原因（退回凭证时必填）" className="mt-3 w-full rounded-[8px] border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-700" />
          <button disabled={pending} onClick={() => act({ action: "CONFIRM_PAYMENT", attemptId: pendingAttempt.id }, "仅在你已实际收到款项时确认。确认后订单将显示“已付款”，是否继续？")} className="mt-3 rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            确认已到账
          </button>
          <button disabled={pending || !paymentRejectionReason.trim()} onClick={() => act({ action: "REJECT_PAYMENT", attemptId: pendingAttempt.id, reason: paymentRejectionReason }, "确认尚未收到该笔款项并退回凭证？项目方可以更正后重新提交。")} className="ml-2 mt-3 rounded-full border border-amber-800 px-5 py-2.5 text-sm font-semibold text-amber-950 disabled:opacity-40">
            未到账，退回凭证
          </button>
        </div>
      ) : null}

      {canProviderAct && order.fulfillmentStatus === "NOT_STARTED" && !isCompleted ? (
        <div className="mt-5 border-t border-black/8 pt-5">
          <h3 className="font-semibold text-ink">开始履约</h3>
          <p className="mt-1 text-sm leading-6 text-ink/50">是否已付款不由平台强制判断，双方可按账期或已确认条件开始执行。</p>
          <button disabled={pending} onClick={() => act({ action: "START_FULFILLMENT" }, "确认已经按约定开始履约？")} className="mt-3 rounded-full border border-black/12 px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-40">
            标记开始交付
          </button>
        </div>
      ) : null}

      {canProviderAct && order.fulfillmentStatus === "PRODUCTION" && !isCompleted ? (
        <div className="mt-5 border-t border-black/8 pt-5">
          <h3 className="font-semibold text-ink">提交交付凭证</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} placeholder="物流 / 网盘 / 当面交付" className="rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
            <input value={deliveryReference} onChange={(event) => setDeliveryReference(event.target.value)} placeholder="物流单号 / 文件链接编号 / 凭证号" className="rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
          </div>
          <textarea value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} placeholder="交付说明（选填）" className="mt-3 min-h-20 w-full rounded-[8px] border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-black/30" />
          <button disabled={pending || !deliveryMethod.trim() || !deliveryReference.trim()} onClick={() => act({ action: "MARK_DELIVERED", deliveryMethod, evidenceReference: deliveryReference, note: deliveryNote || undefined }, "确认已经完成交付并提交该凭证？")} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            提交交付凭证
          </button>
        </div>
      ) : null}

      {canBuyerAct && order.fulfillmentStatus === "DELIVERED" && !isCompleted ? (
        <div className="mt-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-950">服务商已提交交付凭证</p>
          <p className="mt-1 break-all text-sm text-emerald-900/70">{order.trackingCompany} · {order.trackingNumber}</p>
          <button disabled={pending} onClick={() => act({ action: "ACCEPT_DELIVERY" }, "确认交付内容已经验收通过？此操作会完成订单。")} className="mt-3 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            确认验收完成
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-[8px] bg-paper px-4 py-3 text-sm text-ink/65">{message}</p> : null}
    </section>
  );
}
