"use client";

import { useState, useTransition } from "react";

export function OnlinePaymentButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function pay() {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/payment`, {
          method: "POST",
          headers: { "Idempotency-Key": `checkout-retry:${crypto.randomUUID()}` }
        });
        const result = await response.json().catch(() => null) as { checkoutUrl?: string; message?: string } | null;
        if (!response.ok || !result?.checkoutUrl) {
          setMessage(result?.message ?? "暂时无法创建收银台，请稍后重试。");
          return;
        }
        window.location.assign(result.checkoutUrl);
      } catch {
        setMessage("网络连接失败，尚未确认支付结果；请勿重复付款，稍后刷新订单状态。");
      }
    });
  }

  return (
    <div className="mt-4 rounded-[8px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <p className="font-semibold">在线支付</p>
      <p className="mt-1 text-xs leading-5">只从这里进入支付宝官方收银台。订单状态仅依据支付宝服务器验签回调更新。</p>
      <button type="button" disabled={pending} onClick={pay} className="mt-3 rounded-full bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "正在创建收银台…" : "前往支付宝付款"}
      </button>
      {message ? <p className="mt-2 text-xs leading-5">{message}</p> : null}
    </div>
  );
}
