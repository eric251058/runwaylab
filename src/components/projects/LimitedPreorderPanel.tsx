"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type Product = {
  id: string;
  title: string;
  description: string | null;
  materialDescription: string | null;
  careInstructions: string | null;
  imageStage: string | null;
  price: number;
  currency: string;
  preorderLimit: number;
  estimatedShipDate: string | null;
  skus: Array<{ id: string; size: string; color: string; priceOverride?: number | null; capacity?: number | null }>;
};

type LimitedPreorderPanelProps = {
  projectId: string;
  products: Product[];
  isLoggedIn: boolean;
  buyerContactVerified: boolean;
  buyerQuantityLimit: number;
  campaign: {
    title: string;
    targetQuantity: number;
    capacity: number;
    deadline: string;
    qualificationMode: "CONFIRMED_ORDER" | "PAID_ORDER";
    termsVersion: string;
    termsText: string;
    paymentInstructions: string | null;
  };
};

type PreorderResponse = {
  error?: string;
  repeated?: boolean;
  order?: {
    id: string;
    reservationExpiresAt?: string | null;
  };
};

function formatMoneyCents(value: number, currency = "CNY") {
  const amount = (value / 100).toFixed(2);
  return currency === "CNY" ? `¥${amount}` : `${amount} ${currency}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

export function LimitedPreorderPanel({ projectId, products, isLoggedIn, buyerContactVerified, buyerQuantityLimit, campaign }: LimitedPreorderPanelProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [skuId, setSkuId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const product = products.find((item) => item.id === productId) ?? products[0];

  function submit(formData: FormData) {
    setMessage(null);
    setSubmittedOrderId(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/preorders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({
            productId,
            skuId,
            quantity: formData.get("quantity"),
            buyerNote: formData.get("buyerNote"),
            acceptPreorderTerms: formData.get("acceptPreorderTerms") === "on"
          })
        });
        const data = (await response.json().catch(() => null)) as PreorderResponse | null;
        if (!response.ok) {
          setMessage(data?.error ?? "提交失败，请稍后再试。");
          return;
        }

        const lockNotice = data?.order?.reservationExpiresAt
          ? campaign.qualificationMode === "PAID_ORDER"
            ? `名额锁定至 ${formatDateTime(data.order.reservationExpiresAt)}，逾期且未确认付款需重新提交。`
            : `名额暂时锁定至 ${formatDateTime(data.order.reservationExpiresAt)}；平台须在此之前完成真实意向核验，逾期会释放名额。`
          : "平台后续会人工确认该订单意向。";
        setMessage(`${data?.repeated ? "已有相同规格的有效预订。" : "已提交预订意向。"}${lockNotice}`);
        setSubmittedOrderId(data?.order?.id ?? null);
        setIdempotencyKey(crypto.randomUUID());
      } catch {
        setMessage("网络连接失败，本次提交结果尚未确认。请保持当前页面并重试；系统会使用同一提交标识避免重复下单。");
      }
    });
  }

  if (!products.length) return null;

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <h2 className="text-2xl font-semibold text-ink">限量预售</h2>
      <p className="mt-2 text-sm font-semibold text-red-700">预售不等于现货，提交也不代表已付款或平台已保证生产。</p>
      <div className="mt-4 grid gap-3 rounded-[8px] bg-paper p-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-ink/40">成团口径</p><p className="mt-1 font-semibold">{campaign.qualificationMode === "PAID_ORDER" ? "已确认付款订单" : "已人工确认订单意向"} ≥ {campaign.targetQuantity} 件</p></div>
        <div><p className="text-xs text-ink/40">本期总限量</p><p className="mt-1 font-semibold">{campaign.capacity} 件</p></div>
        <div><p className="text-xs text-ink/40">截止时间</p><p className="mt-1 font-semibold">{formatDateTime(campaign.deadline)}</p></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-ink/48">达到成团目标且生产责任方承接证据通过核验后，平台才会记录进入生产；未达标会关闭本期。预计发货时间不是现货承诺，可能受打样、生产与质检影响。条款版本：{campaign.termsVersion}。</p>
      {campaign.qualificationMode === "CONFIRMED_ORDER" ? (
        <div className="mt-4 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
          <p className="font-semibold">本期不在线收款、不收定金，也不提供线下转账指引。</p>
          <p className="mt-1">提交只会形成待平台人工核验的订单意向，不会扣款；请勿向任何个人、群聊、收款码或非官方链接付款。</p>
        </div>
      ) : null}
      {campaign.qualificationMode === "PAID_ORDER" ? (
        <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          <p className="font-semibold">当前为人工付款确认试点，不会在提交时自动扣款。</p>
          <p className="mt-1">提交成功后会显示本笔订单精确的名额锁定到期时间，最长为 30 分钟且不会晚于本期截止时间。请只按 RunwayLab 官方订单页或平台人工确认指引操作；未被订单状态确认为已付款，不计入付款成团口径。</p>
          <p className="mt-2 whitespace-pre-line rounded-[6px] bg-white/70 p-3"><span className="font-semibold">本期人工付款指引：</span>{campaign.paymentInstructions ?? "本期尚未提供可执行的人工付款指引，请勿向任何个人或未验证账户转账，并联系 RunwayLab 确认。"}</p>
        </div>
      ) : null}
      {product ? (
        <div className="mt-4 rounded-[8px] border border-black/8 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-ink">{product.title}</p>
              <p className="mt-1 text-xs text-ink/45">商品硬限量 {product.preorderLimit} 件 · 预计发货 {product.estimatedShipDate ? formatDateTime(product.estimatedShipDate) : "待确认"}</p>
            </div>
            <p className="font-semibold text-ink">{formatMoneyCents(product.price, product.currency)}</p>
          </div>
          <p className="mt-3 whitespace-pre-line text-xs leading-5 text-ink/58">{product.description ?? "暂无商品补充说明。"}</p>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-ink/52 sm:grid-cols-2">
            <p className="rounded-[6px] bg-paper p-3"><span className="font-semibold text-ink/70">当前展示图片阶段：</span>{product.imageStage ?? "待确认"}</p>
            <p className="rounded-[6px] bg-paper p-3"><span className="font-semibold text-ink/70">面料与工艺：</span>{product.materialDescription ?? "待确认"}</p>
            <p className="rounded-[6px] bg-paper p-3"><span className="font-semibold text-ink/70">护理说明：</span>{product.careInstructions ?? "待确认"}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-4 rounded-[8px] border border-black/8 bg-paper p-4 text-xs leading-5 text-ink/58">
        <p className="font-semibold text-ink">限量预售条款正文（{campaign.termsVersion}）</p>
        <p className="mt-2 whitespace-pre-line">{campaign.termsText}</p>
      </div>
      {isLoggedIn && buyerContactVerified ? (
        <form action={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={productId} onChange={(event) => { setProductId(event.target.value); setSkuId(""); }} className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm">
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.title} / {formatMoneyCents(item.price, item.currency)}</option>
            ))}
          </select>
          <select required value={skuId} onChange={(event) => setSkuId(event.target.value)} className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm">
            <option value="">请选择规格</option>
            {product?.skus.map((sku) => (
              <option key={sku.id} value={sku.id}>{sku.size} / {sku.color} / {formatMoneyCents(sku.priceOverride ?? product.price, product.currency)} / 限 {sku.capacity ?? "待确认"}</option>
            ))}
          </select>
          <input name="quantity" type="number" min={1} max={buyerQuantityLimit} required defaultValue="1" aria-label={`数量，每个账号本期最多 ${buyerQuantityLimit} 件`} className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm" />
          <input name="buyerNote" placeholder="备注，可选" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm" />
          <label className="flex items-start gap-2 text-xs leading-5 text-ink/58 md:col-span-2"><input name="acceptPreorderTerms" type="checkbox" required className="mt-1" />我已完整阅读并同意以上 {campaign.termsVersion} 条款正文，理解预售不等于现货；本期不收款、不收定金，我提交的尺码、颜色和数量会作为真实订单意向记录。</label>
          <button disabled={isPending} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
            {isPending ? "提交中..." : "提交预订意向"}
          </button>
        </form>
      ) : isLoggedIn ? (
        <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">首期仅允许已完成人工联系方式核验的账号提交。</p>
          <p className="mt-1 text-xs">当前暂不提供自助验证。请联系 RunwayLab 平台，由工作人员在核对邮箱或手机号归属并记录证据编号后开放；核验不代表付款或订单确认。</p>
        </div>
      ) : (
        <a href={`/login?next=/projects/${projectId}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">登录后提交预订</a>
      )}
      {message ? (
        <div className="mt-3 rounded-[6px] border border-black/8 bg-paper p-3 text-sm text-ink/58">
          <p>{message}</p>
          {submittedOrderId ? <Link href={`/me/orders/${submittedOrderId}`} className="mt-2 inline-flex font-semibold text-ink underline">查看本笔订单记录</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
