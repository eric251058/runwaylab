"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Campaign = { title: string; status: string; targetCount: number; currentCount: number; estimatedPrice: string | null; sizeOptions: string[]; colorOptions: string[]; startDate: string | null; endDate: string | null };

export function ProjectMarketValidation({ projectId, campaign, eligible }: { projectId: string; campaign: Campaign | null; eligible: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = "h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm outline-none focus:border-ink";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/me/projects/collaboration/${projectId}/market-validation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(false); setMessage(data?.message ?? (response.ok ? "市场验证已开启。" : "开启失败。"));
    if (response.ok) router.refresh();
  }

  if (campaign) return <section className="rounded-[8px] border border-black/8 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-ink">市场验证</h2><p className="mt-1 text-sm text-ink/52">{campaign.title}</p></div><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold">{campaign.status === "ACTIVE" ? "收集意向中" : campaign.status}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-[6px] bg-paper p-4"><p className="text-xs text-ink/40">未付款意向数量</p><p className="mt-1 text-2xl font-semibold">{campaign.currentCount}</p></div><div className="rounded-[6px] bg-paper p-4"><p className="text-xs text-ink/40">验证目标</p><p className="mt-1 text-2xl font-semibold">{campaign.targetCount}</p></div></div>
    <p className="mt-3 text-xs leading-5 text-ink/45">预计价格：{campaign.estimatedPrice ?? "待定"}。意向不是订单，不代表已付款或必须生产；达到目标后仍需单独做生产与预售决策。</p>
  </section>;

  return <section className="rounded-[8px] border border-black/8 bg-white p-5">
    <h2 className="text-xl font-semibold text-ink">开启市场验证</h2>
    <p className="mt-2 text-sm leading-6 text-ink/52">仅公开共创、设计授权已确认且样衣阶段已验收的项目可开启。这里不收款，也不会自动进入生产。</p>
    {!eligible ? <p className="mt-4 rounded-[6px] bg-amber-50 p-3 text-sm text-amber-900">当前尚未满足开放条件，请先完成公开设置、设计授权和样衣验收。</p> : <form onSubmit={submit} className="mt-4 grid gap-3">
      <input name="title" required minLength={6} placeholder="市场验证标题" className={input} />
      <textarea name="description" required minLength={20} placeholder="说明产品、适用场景、预计交付和验证目的（至少 20 字）" className="min-h-24 rounded-[6px] border border-black/10 p-3 text-sm outline-none focus:border-ink" />
      <div className="grid gap-3 sm:grid-cols-2"><input name="targetCount" type="number" min={5} max={10000} defaultValue={30} className={input} /><input name="estimatedPrice" required placeholder="预计价格，如 ¥699–899" className={input} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><input name="sizeOptions" required placeholder="尺码，逗号分隔：S,M,L" className={input} /><input name="colorOptions" required placeholder="颜色，逗号分隔：白色,蓝色" className={input} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-ink/45">开始日期<input name="startDate" type="date" required className={`mt-1 ${input}`} /></label><label className="text-xs text-ink/45">结束日期<input name="endDate" type="date" required className={`mt-1 ${input}`} /></label></div>
      <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "开启中..." : "开启未付款市场验证"}</button>
    </form>}
    {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
  </section>;
}
