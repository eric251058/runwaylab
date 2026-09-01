"use client";

import { useState } from "react";

export function StageProposalForm({ projectId, stageId, loggedIn }: { projectId: string; stageId: string; loggedIn: boolean }) {
  const [summary, setSummary] = useState("");
  const [priceYuan, setPriceYuan] = useState("");
  const [days, setDays] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [revisionRounds, setRevisionRounds] = useState("1");
  const [commercialNote, setCommercialNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!loggedIn) { location.href = `/login?next=${encodeURIComponent(`/projects/${projectId}`)}`; return; }
    setBusy(true); setMessage("");
    const price = priceYuan ? Math.round(Number(priceYuan) * 100) : null;
    const response = await fetch(`/api/projects/${projectId}/stage-proposals`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId,
        summary,
        price: Number.isFinite(price) ? price : 0,
        leadTimeDays: Number(days),
        deliverables: deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
        acceptanceCriteria: acceptanceCriteria.split("\n").map((item) => item.trim()).filter(Boolean),
        revisionRounds: Number(revisionRounds),
        commercialNote
      })
    });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(false); setMessage(data?.message ?? (response.ok ? "方案已提交。" : "提交失败。"));
    if (response.ok) setSummary("");
  }
  return <div className="mt-4 rounded-[8px] border border-black/8 bg-paper p-4">
    <p className="text-sm font-semibold text-ink">提交轻量合作响应</p>
    <p className="mt-1 text-xs leading-5 text-ink/48">第一轮不要求免费完成正式设计。请用相关经验和清晰的商业条件证明你适合这个项目。</p>
    <textarea value={summary} onChange={(event) => setSummary(event.target.value.slice(0, 1200))} placeholder="说明方向、相关经验和解决思路（至少20字）" className="mt-3 min-h-28 w-full rounded-[6px] border border-black/10 bg-white p-3 text-sm outline-none focus:border-ink" />
    <div className="mt-2 grid gap-2 sm:grid-cols-3"><input value={priceYuan} onChange={(event) => setPriceYuan(event.target.value)} inputMode="decimal" placeholder="明确报价（元）" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm" /><input value={days} onChange={(event) => setDays(event.target.value)} inputMode="numeric" placeholder="交付天数" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm" /><input value={revisionRounds} onChange={(event) => setRevisionRounds(event.target.value)} inputMode="numeric" placeholder="包含修改次数" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm" /></div>
    <div className="mt-2 grid gap-2 sm:grid-cols-2"><textarea value={deliverables} onChange={(event) => setDeliverables(event.target.value)} placeholder={'交付内容，每行一项\n例如：设计方向稿\n面辅料建议'} className="min-h-28 rounded-[6px] border border-black/10 bg-white p-3 text-sm" /><textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} placeholder={'客观验收标准，每行一项\n例如：包含正背面款式图'} className="min-h-28 rounded-[6px] border border-black/10 bg-white p-3 text-sm" /></div>
    <textarea value={commercialNote} onChange={(event) => setCommercialNote(event.target.value.slice(0, 500))} placeholder="说明报价包含范围、超出修改次数后的费用、版权或商业授权边界（至少10字）" className="mt-2 min-h-20 w-full rounded-[6px] border border-black/10 bg-white p-3 text-sm" />
    <button disabled={busy || summary.trim().length < 20 || !priceYuan || !days || !deliverables.trim() || !acceptanceCriteria.trim() || commercialNote.trim().length < 10} onClick={submit} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "提交中..." : loggedIn ? "提交合作响应" : "登录后提交"}</button>
    {message ? <p className="mt-2 text-sm text-ink/58">{message}</p> : null}
  </div>;
}
