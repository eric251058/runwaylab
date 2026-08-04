"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectIntakeReviewPanelProps = {
  intakeId: string;
  status: string;
  expectedUpdatedAt: string;
};

type Decision = "ACCEPTED" | "NEEDS_INFO" | "DECLINED";

export function ProjectIntakeReviewPanel({ intakeId, status, expectedUpdatedAt }: ProjectIntakeReviewPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const disabled = status !== "SUBMITTED" || Boolean(submitting);

  async function submit(decision: Decision) {
    if (disabled && status !== "SUBMITTED") return;
    setMessage("");
    setSubmitting(decision);
    const response = await fetch(`/api/admin/project-intakes/${intakeId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        note,
        expectedUpdatedAt
      })
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    setSubmitting(null);
    setConfirmDecline(false);

    if (!response.ok) {
      setMessage(data?.message ?? "处理失败，请刷新后再试。");
      return;
    }

    setMessage("评估结果已保存。");
    router.refresh();
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Review</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">平台评估</h2>
        </div>
        {status !== "SUBMITTED" ? <p className="text-sm text-ink/45">只有等待平台评估的项目可以处理。</p> : null}
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-ink/58">给用户的反馈</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          disabled={disabled}
          className="mt-2 min-h-32 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white disabled:text-ink/35"
          placeholder="通过评估可不填；需要补充和暂不适合必须写清楚具体原因。"
        />
        <span className="mt-2 block text-xs text-ink/40">{note.length} / 500</span>
      </label>

      {message ? <p className="mt-4 rounded-[8px] border border-black/8 bg-paper px-4 py-3 text-sm text-ink/62">{message}</p> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={disabled} onClick={() => submit("ACCEPTED")} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-45">
          {submitting === "ACCEPTED" ? "处理中" : "通过评估"}
        </button>
        <button type="button" disabled={disabled} onClick={() => submit("NEEDS_INFO")} className="min-h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink disabled:opacity-45">
          {submitting === "NEEDS_INFO" ? "处理中" : "需要补充"}
        </button>
        <button type="button" disabled={disabled} onClick={() => setConfirmDecline(true)} className="min-h-11 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 disabled:opacity-45">
          暂不适合
        </button>
      </div>

      {confirmDecline ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-[0_24px_70px_rgba(16,16,16,0.22)]">
            <h3 className="text-xl font-semibold text-ink">确认暂不适合？</h3>
            <p className="mt-3 text-sm leading-6 text-ink/62">用户会看到克制的评估结果和你填写的具体反馈。原项目资料和时间线会保留。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDecline(false)} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                取消
              </button>
              <button type="button" disabled={Boolean(submitting)} onClick={() => submit("DECLINED")} className="h-10 rounded-full bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-45">
                {submitting === "DECLINED" ? "处理中" : "确认暂不适合"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
