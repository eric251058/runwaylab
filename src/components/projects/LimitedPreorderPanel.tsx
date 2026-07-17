"use client";

import { useState, useTransition } from "react";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  skus: Array<{ id: string; size: string; color: string; priceOverride?: number | null }>;
};

type LimitedPreorderPanelProps = {
  projectId: string;
  products: Product[];
  isLoggedIn: boolean;
};

function formatMoneyCents(value: number, currency = "CNY") {
  const amount = (value / 100).toFixed(2);
  return currency === "CNY" ? `¥${amount}` : `${amount} ${currency}`;
}

export function LimitedPreorderPanel({ projectId, products, isLoggedIn }: LimitedPreorderPanelProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [skuId, setSkuId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const product = products.find((item) => item.id === productId) ?? products[0];

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/preorders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          skuId,
          quantity: formData.get("quantity"),
          buyerNote: formData.get("buyerNote")
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(response.ok ? "已提交预订意向，平台后续人工确认。" : data?.error ?? "提交失败，请稍后再试。");
    });
  }

  if (!products.length) return null;

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <h2 className="text-2xl font-semibold text-ink">限量预订</h2>
      <p className="mt-2 text-sm leading-6 text-ink/58">当前只收集预订意向，不会在线收款。</p>
      {isLoggedIn ? (
        <form action={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={productId} onChange={(event) => { setProductId(event.target.value); setSkuId(""); }} className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm">
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.title} / {formatMoneyCents(item.price, item.currency)}</option>
            ))}
          </select>
          <select value={skuId} onChange={(event) => setSkuId(event.target.value)} className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm">
            <option value="">选择规格，可稍后确认</option>
            {product?.skus.map((sku) => (
              <option key={sku.id} value={sku.id}>{sku.size} / {sku.color} / {formatMoneyCents(sku.priceOverride ?? product.price, product.currency)}</option>
            ))}
          </select>
          <input name="quantity" inputMode="numeric" defaultValue="1" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm" />
          <input name="buyerNote" placeholder="备注，可选" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm" />
          <button disabled={isPending} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
            {isPending ? "提交中..." : "提交预订意向"}
          </button>
        </form>
      ) : (
        <a href={`/login?next=/projects/${projectId}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">登录后提交预订</a>
      )}
      {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
    </section>
  );
}
