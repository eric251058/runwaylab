"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, FileCheck2, RotateCcw, XCircle } from "lucide-react";

type Proposal = {
  id: string;
  type: "FABRIC" | "SAMPLE" | "PRODUCTION" | "BUYER_INTENT" | "OTHER";
  title: string;
  summary: string | null;
  description: string | null;
  estimatedPrice: string | null;
  estimatedTime: string | null;
  moq: string | null;
  priceMin: number | null;
  priceMax: number | null;
  leadTimeDays: number | null;
  minimumQuantity: number | null;
  status: "PENDING" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
};

type Milestone = {
  id: string;
  title: string;
  stage: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  dueAt: string | null;
  completedAt: string | null;
  note: string | null;
};

type Props = {
  projectId: string;
  providerName: string | null;
  canSubmit: boolean;
  canDecide: boolean;
  proposals: Proposal[];
  milestones: Milestone[];
};

const typeLabels: Record<Proposal["type"], string> = {
  FABRIC: "面料供应",
  SAMPLE: "打样服务",
  PRODUCTION: "生产制造",
  BUYER_INTENT: "采购合作",
  OTHER: "其他服务"
};

const statusLabels: Record<Proposal["status"], string> = {
  PENDING: "待项目方确认",
  SHORTLISTED: "待服务商调整",
  ACCEPTED: "双方已确认",
  REJECTED: "已关闭"
};

const statusStyles: Record<Proposal["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  SHORTLISTED: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-black/5 text-ink/45"
};

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function formatDate(value: string | null) {
  if (!value) return "待双方确定";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function ProjectCommercialTerms({
  projectId,
  providerName,
  canSubmit,
  canDecide,
  proposals,
  milestones
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const latest = proposals[0] ?? null;
  const accepted = useMemo(
    () => proposals.find((proposal) => proposal.status === "ACCEPTED") ?? null,
    [proposals]
  );
  const editable = latest?.status === "SHORTLISTED" ? latest : null;

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      type: String(form.get("type") ?? "OTHER"),
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      description: String(form.get("description") ?? "") || null,
      estimatedPrice: String(form.get("estimatedPrice") ?? ""),
      estimatedTime: String(form.get("estimatedTime") ?? ""),
      moq: String(form.get("moq") ?? ""),
      priceMin: numberOrNull(form.get("priceMin")),
      priceMax: numberOrNull(form.get("priceMax")),
      leadTimeDays: numberOrNull(form.get("leadTimeDays")),
      minimumQuantity: numberOrNull(form.get("minimumQuantity"))
    };

    const response = await fetch("/api/me/projects/collaboration/" + projectId + "/proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "提交失败，请稍后重试。" }));
    setBusy(false);
    setMessage(result.message ?? (response.ok ? "方案已提交。" : "提交失败，请稍后重试。"));
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  async function decide(proposalId: string, action: "ACCEPTED" | "REVISION_REQUESTED" | "REJECTED") {
    if (action === "ACCEPTED" && !window.confirm("确认后将建立执行里程碑。是否确认这份合作方案？")) return;
    if (action === "REJECTED" && !window.confirm("拒绝后该版本将关闭。是否继续？")) return;
    if (action === "REVISION_REQUESTED" && revisionNote.trim().length < 5) {
      setMessage("请写明需要调整的内容。");
      return;
    }

    setBusy(true);
    setMessage("");
    const response = await fetch(
      "/api/me/projects/collaboration/" + projectId + "/proposal/" + proposalId + "/decision",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: revisionNote })
      }
    );
    const result = await response.json().catch(() => ({ message: "操作失败，请稍后重试。" }));
    setBusy(false);
    setMessage(result.message ?? (response.ok ? "操作成功。" : "操作失败，请稍后重试。"));
    if (response.ok) {
      setRevisionNote("");
      router.refresh();
    }
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">合作方案</h2>
          <p className="mt-2 text-sm leading-6 text-ink/52">
            把报价、数量和周期变成双方可确认的版本。聊天用于解释，方案用于成交。
          </p>
        </div>
        {accepted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已确认
          </span>
        ) : null}
      </div>

      {latest ? (
        <article className="mt-5 rounded-[8px] border border-black/8 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-ink/42">{typeLabels[latest.type]}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{latest.title}</h3>
            </div>
            <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + statusStyles[latest.status]}>
              {statusLabels[latest.status]}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/62">{latest.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[6px] bg-paper p-3">
              <p className="text-xs font-semibold text-ink/40">报价</p>
              <p className="mt-1 text-sm font-semibold text-ink">{latest.estimatedPrice || "待确定"}</p>
            </div>
            <div className="rounded-[6px] bg-paper p-3">
              <p className="text-xs font-semibold text-ink/40">交付周期</p>
              <p className="mt-1 text-sm font-semibold text-ink">{latest.estimatedTime || "待确定"}</p>
            </div>
            <div className="rounded-[6px] bg-paper p-3">
              <p className="text-xs font-semibold text-ink/40">起订要求</p>
              <p className="mt-1 text-sm font-semibold text-ink">{latest.moq || "待确定"}</p>
            </div>
          </div>
          {latest.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/58">{latest.description}</p>
          ) : null}

          {canDecide && latest.status === "PENDING" ? (
            <div className="mt-5 border-t border-black/8 pt-4">
              <label className="block text-sm font-semibold text-ink">
                调整说明
                <textarea
                  value={revisionNote}
                  onChange={(event) => setRevisionNote(event.target.value)}
                  placeholder="如需调整，请明确价格、数量、时间或交付范围。"
                  className="mt-2 min-h-24 w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => decide(latest.id, "ACCEPTED")} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">
                  <FileCheck2 className="h-4 w-4" />
                  确认方案
                </button>
                <button disabled={busy} onClick={() => decide(latest.id, "REVISION_REQUESTED")} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink disabled:opacity-45">
                  <RotateCcw className="h-4 w-4" />
                  要求调整
                </button>
                <button disabled={busy} onClick={() => decide(latest.id, "REJECTED")} className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-600 disabled:opacity-45">
                  <XCircle className="h-4 w-4" />
                  拒绝本版
                </button>
              </div>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/52">
          尚未提交结构化方案。不要在聊天中只写“价格可谈”，应明确范围、报价、周期和起订条件。
        </div>
      )}

      {canSubmit && !accepted ? (
        <form onSubmit={submitProposal} className="mt-5 border-t border-black/8 pt-5">
          <h3 className="font-semibold text-ink">{editable ? "提交调整后的新版本" : "提交合作方案"}</h3>
          <p className="mt-1 text-xs leading-5 text-ink/45">每次提交都会保留旧版本，避免关键条件被覆盖。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select name="type" defaultValue={editable?.type ?? "PRODUCTION"} className="h-11 rounded-[8px] border border-black/10 px-3 text-sm">
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input name="title" required maxLength={100} defaultValue={editable?.title ?? ""} placeholder="方案标题" className="h-11 rounded-[8px] border border-black/10 px-3 text-sm" />
          </div>
          <textarea name="summary" required minLength={10} maxLength={500} defaultValue={editable?.summary ?? ""} placeholder="交付范围：具体提供什么、包含什么、不包含什么" className="mt-3 min-h-24 w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm" />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input name="estimatedPrice" required defaultValue={editable?.estimatedPrice ?? ""} placeholder="报价，如 ¥30,000 含税" className="h-11 rounded-[8px] border border-black/10 px-3 text-sm" />
            <input name="estimatedTime" required defaultValue={editable?.estimatedTime ?? ""} placeholder="周期，如 25 天" className="h-11 rounded-[8px] border border-black/10 px-3 text-sm" />
            <input name="moq" required defaultValue={editable?.moq ?? ""} placeholder="起订要求，如 500 件" className="h-11 rounded-[8px] border border-black/10 px-3 text-sm" />
          </div>
          <details className="mt-3 rounded-[8px] bg-paper p-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink/65">补充结构化数字</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <input name="priceMin" type="number" min={0} defaultValue={editable?.priceMin ?? ""} placeholder="最低价" className="h-10 rounded-[8px] border border-black/10 px-3 text-sm" />
              <input name="priceMax" type="number" min={0} defaultValue={editable?.priceMax ?? ""} placeholder="最高价" className="h-10 rounded-[8px] border border-black/10 px-3 text-sm" />
              <input name="leadTimeDays" type="number" min={1} max={730} defaultValue={editable?.leadTimeDays ?? ""} placeholder="交期天数" className="h-10 rounded-[8px] border border-black/10 px-3 text-sm" />
              <input name="minimumQuantity" type="number" min={0} defaultValue={editable?.minimumQuantity ?? ""} placeholder="最小数量" className="h-10 rounded-[8px] border border-black/10 px-3 text-sm" />
            </div>
          </details>
          <textarea name="description" maxLength={1200} defaultValue={editable?.description ?? ""} placeholder="付款节点、打样次数、质量标准、运输方式等补充条款" className="mt-3 min-h-28 w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm" />
          <button disabled={busy} className="mt-3 h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-45">
            {busy ? "提交中…" : editable ? "提交调整版" : "提交给项目方确认"}
          </button>
        </form>
      ) : null}

      {milestones.length ? (
        <div className="mt-5 border-t border-black/8 pt-5">
          <h3 className="font-semibold text-ink">执行里程碑</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {milestones.map((milestone) => (
              <article key={milestone.id} className="rounded-[8px] bg-paper p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {milestone.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-ink/35" />}
                  {milestone.title}
                </p>
                <p className="mt-2 text-xs text-ink/45">{formatDate(milestone.dueAt ?? milestone.completedAt)}</p>
                {milestone.note ? <p className="mt-2 text-xs leading-5 text-ink/55">{milestone.note}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-[8px] bg-paper px-3 py-2 text-sm text-ink/65">{message}</p> : null}
      {providerName ? <p className="mt-3 text-xs text-ink/35">当前服务商：{providerName}</p> : null}
    </section>
  );
}
