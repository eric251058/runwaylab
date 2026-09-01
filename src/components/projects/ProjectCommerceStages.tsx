"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Proposal = { id: string; summary: string; price: number | null; currency: string; leadTimeDays: number | null; status: string; deliverables: unknown; commercialNote: string | null; revisionRounds: number; acceptanceCriteria: unknown; applicant: { nickname: string }; provider: { name: string } | null };
type Stage = { id: string; stage: string; status: string; title: string; selectedProposalId: string | null; commitmentStatus: string; commitmentAmount: number | null; commitmentReference: string | null; commitmentNote: string | null; proposals: Proposal[] };

const statusLabels: Record<string, string> = {
  BLOCKED: "等待上一阶段", OPEN: "开放征集", SELECTION_PENDING: "待选择", SELECTED: "已选定",
  IN_PROGRESS: "合作进行中", ACCEPTANCE: "待验收", COMPLETED: "已完成", CANCELLED: "已取消"
};

const commitmentLabels: Record<string, string> = { NOT_REQUIRED: "无需启动款", REQUIRED: "待提交启动款", EVIDENCE_PENDING: "凭证待核验", VERIFIED: "启动款已核验", REJECTED: "凭证未通过" };

function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export function ProjectCommerceStages({ projectId, stages, canManage, isAdmin }: { projectId: string; stages: Stage[]; canManage: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState<Record<string, string>>({});
  const [commitmentNote, setCommitmentNote] = useState<Record<string, string>>({});

  async function act(stageId: string, action: "SELECT_PROPOSAL" | "START" | "ACCEPT" | "SUBMIT_COMMITMENT_EVIDENCE" | "REVIEW_COMMITMENT", proposalId?: string, approved?: boolean) {
    setBusy(`${stageId}:${action}`); setMessage("");
    const response = await fetch(`/api/me/projects/collaboration/${projectId}/stages/${stageId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "SUBMIT_COMMITMENT_EVIDENCE"
        ? { action, reference: reference[stageId], note: commitmentNote[stageId] || undefined }
        : action === "REVIEW_COMMITMENT" ? { action, approved, note: commitmentNote[stageId] || undefined }
          : { action, proposalId })
    });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(""); setMessage(data?.message ?? (response.ok ? "已更新。" : "操作失败。"));
    if (response.ok) router.refresh();
  }

  return <section className="rounded-[8px] border border-black/8 bg-white p-5">
    <h2 className="text-xl font-semibold text-ink">需求共创阶段</h2>
    <p className="mt-2 text-sm leading-6 text-ink/52">设计确认后才开放面料，面料确认后才开放打样；每阶段最多 5 个候选并只选定一位合作方。正式开工前必须完成对应启动款核验。</p>
    <div className="mt-4 grid gap-3">
      {stages.map((stage, index) => <article key={stage.id} className="rounded-[8px] bg-paper p-4">
        <div className="flex items-center justify-between gap-3"><p className="font-semibold text-ink">{index + 1}. {stage.title}</p><span className="text-xs font-semibold text-ink/45">{statusLabels[stage.status] ?? stage.status}</span></div>
        <div className={`mt-3 rounded-[6px] p-3 text-xs leading-5 ${stage.commitmentStatus === "VERIFIED" || stage.commitmentStatus === "NOT_REQUIRED" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
          <span className="font-semibold">{commitmentLabels[stage.commitmentStatus] ?? stage.commitmentStatus}</span>
          {stage.commitmentAmount != null ? ` · ¥${(stage.commitmentAmount / 100).toFixed(2)}` : ""}
          {stage.commitmentNote ? <span className="block mt-1">{stage.commitmentNote}</span> : null}
        </div>
        {canManage && ["REQUIRED", "REJECTED"].includes(stage.commitmentStatus) ? <div className="mt-2 rounded-[6px] border border-amber-200 bg-white p-3">
          <p className="text-xs leading-5 text-ink/55">支付宝正式开通前，请提交线下付款凭证编号。启动金可在后续按协议抵扣，页面不会把它显示成支付宝收款。</p>
          <input value={reference[stage.id] ?? ""} onChange={(event) => setReference((current) => ({ ...current, [stage.id]: event.target.value }))} placeholder="银行流水号 / 凭证编号" className="mt-2 h-10 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
          <textarea value={commitmentNote[stage.id] ?? ""} onChange={(event) => setCommitmentNote((current) => ({ ...current, [stage.id]: event.target.value }))} placeholder="付款说明（选填）" className="mt-2 min-h-16 w-full rounded-[6px] border border-black/10 p-3 text-sm" />
          <button disabled={Boolean(busy) || (reference[stage.id] ?? "").trim().length < 4} onClick={() => act(stage.id, "SUBMIT_COMMITMENT_EVIDENCE")} className="mt-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">提交启动款凭证</button>
        </div> : null}
        {isAdmin && stage.commitmentStatus === "EVIDENCE_PENDING" ? <div className="mt-2 rounded-[6px] border border-black/8 bg-white p-3 text-xs"><p>待核验凭证：{stage.commitmentReference}</p><div className="mt-2 flex gap-2"><button onClick={() => act(stage.id, "REVIEW_COMMITMENT", undefined, true)} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">确认到账</button><button onClick={() => act(stage.id, "REVIEW_COMMITMENT", undefined, false)} className="rounded-full border border-black/15 px-4 py-2 font-semibold">退回凭证</button></div></div> : null}
        {stage.proposals.length ? <div className="mt-3 grid gap-2">{stage.proposals.map((proposal) => <div key={proposal.id} className="rounded-[6px] border border-black/8 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{proposal.provider?.name ?? proposal.applicant.nickname}</p><span className="text-xs text-ink/45">{proposal.price != null ? `¥${(proposal.price / 100).toFixed(2)}` : "待议价"}{proposal.leadTimeDays ? ` · ${proposal.leadTimeDays}天` : ""}</span></div>
          <p className="mt-2 text-sm leading-6 text-ink/58">{proposal.summary}</p>
          <p className="mt-2 text-xs leading-5 text-ink/50">交付：{stringList(proposal.deliverables).join("、") || "未填写"} · 含 {proposal.revisionRounds} 次修改</p>
          <p className="mt-1 text-xs leading-5 text-ink/50">验收：{stringList(proposal.acceptanceCriteria).join("、") || "未填写"}</p>
          {proposal.commercialNote ? <p className="mt-1 text-xs leading-5 text-ink/50">商业边界：{proposal.commercialNote}</p> : null}
          {canManage && ["OPEN", "SELECTION_PENDING"].includes(stage.status) && ["SUBMITTED", "SHORTLISTED"].includes(proposal.status) ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "SELECT_PROPOSAL", proposal.id)} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">选择此方案</button> : null}
        </div>)}</div> : <p className="mt-3 text-sm text-ink/42">尚无方案。</p>}
        {canManage && stage.status === "SELECTED" ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "START")} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">确认开始合作</button> : null}
        {canManage && ["IN_PROGRESS", "ACCEPTANCE"].includes(stage.status) ? <button disabled={Boolean(busy)} onClick={() => act(stage.id, "ACCEPT")} className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">验收并开放下一阶段</button> : null}
      </article>)}
    </div>
    {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
  </section>;
}
