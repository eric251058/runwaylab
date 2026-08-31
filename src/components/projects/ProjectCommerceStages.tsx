"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Proposal = { id: string; summary: string; price: number | null; currency: string; leadTimeDays: number | null; status: string; applicant: { nickname: string }; provider: { name: string } | null };
type Stage = { id: string; stage: string; status: string; title: string; selectedProposalId: string | null; proposals: Proposal[] };

const statusLabels: Record<string, string> = {
  BLOCKED: "等待上一阶段", OPEN: "开放征集", SELECTION_PENDING: "待选择", SELECTED: "已选定",
  IN_PROGRESS: "合作进行中", ACCEPTANCE: "待验收", COMPLETED: "已完成", CANCELLED: "已取消"
};

export function ProjectCommerceStages({ projectId, stages, canManage }: { projectId: string; stages: Stage[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function act(stageId: string, action: "SELECT_PROPOSAL" | "START" | "ACCEPT", proposalId?: string) {
    setBusy(`${stageId}:${action}`); setMessage("");
    const response = await fetch(`/api/me/projects/collaboration/${projectId}/stages/${stageId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, proposalId })
    });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(""); setMessage(data?.message ?? (response.ok ? "已更新。" : "操作失败。"));
    if (response.ok) router.refresh();
  }

  return <section className="rounded-[8px] border border-black/8 bg-white p-5">
    <h2 className="text-xl font-semibold text-ink">需求共创阶段</h2>
    <p className="mt-2 text-sm leading-6 text-ink/52">设计确认后才开放面料，面料确认后才开放打样；每个阶段只选定一位合作方。</p>
    <div className="mt-4 grid gap-3">
      {stages.map((stage, index) => <article key={stage.id} className="rounded-[8px] bg-paper p-4">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold text-ink">{index + 1}. {stage.title}</p><span className="text-xs font-semibold text-ink/45">{statusLabels[stage.status] ?? stage.status}</span></div>
        {stage.proposals.length ? <div className="mt-3 grid gap-2">{stage.proposals.map((proposal) => <div key={proposal.id} className="rounded-[6px] border border-black/8 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{proposal.provider?.name ?? proposal.applicant.nickname}</p><span className="text-xs text-ink/45">{proposal.price != null ? `¥${(proposal.price / 100).toFixed(2)}` : "待议价"}{proposal.leadTimeDays ? ` · ${proposal.leadTimeDays}天` : ""}</span></div>
          <p className="mt-2 text-sm leading-6 text-ink/58">{proposal.summary}</p>
          {canManage && ["OPEN", "SELECTION_PENDING"].includes(stage.status) && ["SUBMITTED", "SHORTLISTED"].includes(proposal.status) ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "SELECT_PROPOSAL", proposal.id)} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">选择此方案</button> : null}
        </div>)}</div> : <p className="mt-3 text-sm text-ink/42">尚无方案。</p>}
        {canManage && stage.status === "SELECTED" ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "START")} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">确认开始合作</button> : null}
        {canManage && ["IN_PROGRESS", "ACCEPTANCE"].includes(stage.status) ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "ACCEPT")} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">验收并开放下一阶段</button> : null}
      </article>)}
    </div>
    {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
  </section>;
}
