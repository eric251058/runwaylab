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

const statusLabels: Record<ActionStatus, string> = {
  ACTIVE: "进行中",
  WAITING_PLATFORM_CONFIRMATION: "已提交，等待平台确认",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

const responsibilityLabels: Record<ActionResponsibility, string> = {
  USER: "需要你完成",
  PLATFORM: "平台正在处理"
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
  const [isPending, startTransition] = useTransition();

  if (!action) {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">启动草稿</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">等待平台安排</span>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink">下一步</h2>
        <p className="mt-2 text-sm leading-6 text-ink/58">正式项目已建立，平台会安排一个明确的下一步。你暂时不用补充图片或联系服务商。</p>
      </section>
    );
  }

  const canSubmit = action.status === "ACTIVE" && action.responsibility === "USER";
  const submittedAt = formatDate(action.userResultSubmittedAt);
  const dueAt = formatDate(action.dueAt);

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
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{statusLabels[action.status]}</span>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{responsibilityLabels[action.responsibility]}</span>
        {dueAt ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">建议完成：{dueAt}</span> : null}
      </div>

      <h2 className="mt-4 text-xl font-semibold text-ink">{action.title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{action.instructions}</p>

      {canSubmit ? (
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            完成说明
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
            {isPending ? "提交中..." : "提交完成结果"}
          </button>
        </div>
      ) : action.status === "WAITING_PLATFORM_CONFIRMATION" ? (
        <div className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
          <p className="font-semibold text-ink">你已提交，等待平台确认。</p>
          {submittedAt ? <p className="mt-1">提交时间：{submittedAt}</p> : null}
          {action.userResultNote ? <p className="mt-2 whitespace-pre-wrap break-words">{action.userResultNote}</p> : null}
        </div>
      ) : (
        <div className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
          {action.responsibility === "PLATFORM" ? "平台正在处理当前步骤，完成后会更新到这里。" : "当前步骤状态已更新。"}
        </div>
      )}

      {message ? <p className="mt-3 text-sm font-semibold text-ink/60">{message}</p> : null}
    </section>
  );
}
