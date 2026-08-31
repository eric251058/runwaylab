"use client";

import { useState } from "react";

export function StageProposalForm({ projectId, stageId, loggedIn }: { projectId: string; stageId: string; loggedIn: boolean }) {
  const [summary, setSummary] = useState("");
  const [priceYuan, setPriceYuan] = useState("");
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!loggedIn) { location.href = `/login?next=${encodeURIComponent(`/projects/${projectId}`)}`; return; }
    setBusy(true); setMessage("");
    const price = priceYuan ? Math.round(Number(priceYuan) * 100) : null;
    const response = await fetch(`/api/projects/${projectId}/stage-proposals`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, summary, price: Number.isFinite(price) ? price : null, leadTimeDays: days ? Number(days) : null, deliverables: [] })
    });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(false); setMessage(data?.message ?? (response.ok ? "方案已提交。" : "提交失败。"));
    if (response.ok) setSummary("");
  }
  return <div className="mt-4 rounded-[8px] border border-black/8 bg-paper p-4">
    <p className="text-sm font-semibold text-ink">提交当前阶段方案</p>
    <textarea value={summary} onChange={(event) => setSummary(event.target.value.slice(0, 1200))} placeholder="说明方向、交付内容、经验与合作方式（至少20字）" className="mt-3 min-h-28 w-full rounded-[6px] border border-black/10 bg-white p-3 text-sm outline-none focus:border-ink" />
    <div className="mt-2 grid grid-cols-2 gap-2"><input value={priceYuan} onChange={(event) => setPriceYuan(event.target.value)} inputMode="decimal" placeholder="报价（元，可选）" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm" /><input value={days} onChange={(event) => setDays(event.target.value)} inputMode="numeric" placeholder="交付天数（可选）" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm" /></div>
    <button disabled={busy || summary.trim().length < 20} onClick={submit} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "提交中..." : loggedIn ? "提交方案" : "登录后提交"}</button>
    {message ? <p className="mt-2 text-sm text-ink/58">{message}</p> : null}
  </div>;
}
