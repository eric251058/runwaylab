"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminRefundForm({ orderId, refundableCents }: { orderId: string; refundableCents: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => `admin-refund:${crypto.randomUUID()}`);

  function submit() {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > refundableCents) {
      setMessage("退款金额必须大于 0 且不能超过可退余额。");
      return;
    }
    if (!window.confirm(`确认通过原支付渠道退款 ¥${(amountCents / 100).toFixed(2)}？退款请求提交后不可在本页面撤销。`)) return;
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify({ amountCents, reason })
        });
        const result = await response.json().catch(() => null) as { message?: string } | null;
        setMessage(result?.message ?? (response.ok ? "退款已处理。" : "退款失败，请进入异常记录复核。"));
        if (response.ok) {
          setIdempotencyKey(`admin-refund:${crypto.randomUUID()}`);
          router.refresh();
        }
      } catch {
        setMessage("网络连接失败，退款结果未知。请先刷新退款记录，不要立即重复提交。");
      }
    });
  }

  return (
    <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-950">原路退款 · 可退 ¥{(refundableCents / 100).toFixed(2)}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-label="退款金额（元）" className="h-10 rounded-[6px] border border-red-200 bg-white px-3 text-sm" />
        <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="退款原因（4–200 字，写入审计记录）" className="h-10 rounded-[6px] border border-red-200 bg-white px-3 text-sm" />
        <button type="button" disabled={pending || reason.trim().length < 4} onClick={submit} className="h-10 rounded-full bg-red-800 px-5 text-sm font-semibold text-white disabled:opacity-45">
          {pending ? "处理中…" : "确认原路退款"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs leading-5 text-red-900">{message}</p> : null}
    </div>
  );
}
