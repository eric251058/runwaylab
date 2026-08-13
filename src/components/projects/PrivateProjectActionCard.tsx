"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ActionStatus = "ACTIVE" | "WAITING_PLATFORM_CONFIRMATION" | "COMPLETED" | "CANCELLED";
type ActionResponsibility = "USER" | "PLATFORM";

export type PrivateProjectActionCardAction = {
  id: string;
  title: string;
  instructions: string;
  status: ActionStatus;
  responsibility: ActionResponsibility;
  dueAt: string | null;
  updatedAt: string;
  userResultNote?: string | null;
  userResultSubmittedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PrivateProjectActionCard({ projectId, action }: { projectId: string; action: PrivateProjectActionCardAction | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!action) {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-sm font-semibold text-ink/45">现在</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">正在准备下一步</h2>
        <p className="mt-3 text-sm leading-6 text-ink/58">我们会根据当前进度继续推进。</p>
      </section>
    );
  }

  const canSubmit = action.status === "ACTIVE" && action.responsibility === "USER";
  const submittedAt = formatDate(action.userResultSubmittedAt);
  const dueAt = formatDate(action.dueAt);

  if (action.status === "WAITING_PLATFORM_CONFIRMATION") {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-sm font-semibold text-ink/45">现在</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">已收到</h2>
        <p className="mt-3 text-sm leading-6 text-ink/58">我们正在确认你提交的信息，你现在不用做任何事。</p>
        {submittedAt ? <p className="mt-4 text-xs font-semibold text-ink/40">提交时间：{submittedAt}</p> : null}
      </section>
    );
  }

  if (action.responsibility === "PLATFORM") {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-sm font-semibold text-ink/45">现在</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">我们正在处理</h2>
        <p className="mt-3 text-sm leading-6 text-ink/58">我们正在根据你的需求整理下一步。</p>
      </section>
    );
  }

  async function submitResult() {
    if (!action || isPending) return;
    setMessage("");

    startTransition(async () => {
      const response = await fetch(`/api/me/projects/collaboration/${projectId}/actions/${action.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionNote: note,
          expectedUpdatedAt: action.updatedAt
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.message ?? "提交失败，请稍后再试。");
        return;
      }
      setNote("");
      setMessage("已提交，等待平台确认。");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <p className="text-sm font-semibold text-ink/45">现在要做</p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">{action.title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{action.instructions}</p>
      {dueAt ? <p className="mt-3 text-xs font-semibold text-ink/40">建议完成：{dueAt}</p> : null}

      {canSubmit && !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-5 min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white"
        >
          继续
        </button>
      ) : canSubmit ? (
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            补充说明
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              className="min-h-28 rounded-[8px] border border-black/10 bg-white px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-ink"
              placeholder="简单说明你已经补充或确认的内容。"
            />
          </label>
          <button
            type="button"
            onClick={submitResult}
            disabled={isPending}
            className="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "提交中..." : "完成"}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
          当前步骤状态已更新。
        </div>
      )}

      {message ? <p className="mt-3 text-sm font-semibold text-ink/60">{message}</p> : null}
    </section>
  );
}
