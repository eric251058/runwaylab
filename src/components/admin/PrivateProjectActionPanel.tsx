"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type ActionType = "DESIGN_CLARIFICATION" | "FABRIC_BRIEF" | "SAMPLE_BRIEF" | "PRODUCTION_FEASIBILITY" | "PLATFORM_PREPARATION";
type ActionResponsibility = "USER" | "PLATFORM";
type ActionStatus = "ACTIVE" | "WAITING_PLATFORM_CONFIRMATION" | "COMPLETED" | "CANCELLED";

export type AdminPrivateProjectAction = {
  id: string;
  type: ActionType;
  responsibility: ActionResponsibility;
  status: ActionStatus;
  title: string;
  instructions: string;
  dueAt: string | null;
  updatedAt: string;
  userResultNote?: string | null;
  userResultSubmittedAt?: string | null;
};

const actionTypeLabels: Record<ActionType, string> = {
  DESIGN_CLARIFICATION: "完善产品设计方向",
  FABRIC_BRIEF: "确认面料需求",
  SAMPLE_BRIEF: "准备打样需求",
  PRODUCTION_FEASIBILITY: "确认生产可行性",
  PLATFORM_PREPARATION: "平台准备下一阶段"
};

const responsibilityLabels: Record<ActionResponsibility, string> = {
  USER: "用户完成",
  PLATFORM: "平台完成"
};

const statusLabels: Record<ActionStatus, string> = {
  ACTIVE: "进行中",
  WAITING_PLATFORM_CONFIRMATION: "等待平台确认",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

function formatDate(value?: string | null) {
  if (!value) return "未设置";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "操作失败，请稍后再试。");
  }
  return payload;
}

export function PrivateProjectActionPanel({
  projectId,
  projectUpdatedAt,
  currentAction
}: {
  projectId: string;
  projectUpdatedAt: string;
  currentAction: AdminPrivateProjectAction | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ActionType>("DESIGN_CLARIFICATION");
  const [responsibility, setResponsibility] = useState<ActionResponsibility>("USER");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const canComplete = useMemo(() => {
    if (!currentAction) return false;
    if (currentAction.responsibility === "USER") return currentAction.status === "WAITING_PLATFORM_CONFIRMATION";
    return currentAction.responsibility === "PLATFORM" && currentAction.status === "ACTIVE";
  }, [currentAction]);

  function run(action: () => Promise<void>) {
    setMessage("");
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "操作失败，请稍后再试。");
      }
    });
  }

  if (!currentAction) {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">安排当前唯一下一步</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            动作类型
            <select value={type} onChange={(event) => setType(event.target.value as ActionType)} className="h-11 rounded-[8px] border border-black/10 px-3 text-sm font-normal">
              {Object.entries(actionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            责任方
            <select value={responsibility} onChange={(event) => setResponsibility(event.target.value as ActionResponsibility)} className="h-11 rounded-[8px] border border-black/10 px-3 text-sm font-normal">
              {Object.entries(responsibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            标题
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={40} className="h-11 rounded-[8px] border border-black/10 px-3 text-sm font-normal" placeholder="例如：补充目标用户与款式细节" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            具体说明
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={1000} className="min-h-28 rounded-[8px] border border-black/10 px-3 py-3 text-sm font-normal leading-6" placeholder="写清楚用户或平台下一步要完成什么。" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            建议完成时间
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-11 rounded-[8px] border border-black/10 px-3 text-sm font-normal" />
          </label>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(async () => {
                await postJson(`/api/admin/projects/${projectId}/actions`, {
                  type,
                  responsibility,
                  title,
                  instructions,
                  dueAt,
                  expectedProjectUpdatedAt: projectUpdatedAt
                });
                setTitle("");
                setInstructions("");
                setDueAt("");
                setMessage("下一步已创建。");
              })
            }
            className="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "处理中..." : "创建下一步"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-ink/60">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{statusLabels[currentAction.status]}</span>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{responsibilityLabels[currentAction.responsibility]}</span>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{actionTypeLabels[currentAction.type]}</span>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-ink">{currentAction.title}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{currentAction.instructions}</p>
      <p className="mt-3 text-xs font-semibold text-ink/40">建议完成时间：{formatDate(currentAction.dueAt)}</p>
      {currentAction.userResultNote ? (
        <div className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
          <p className="font-semibold text-ink">用户提交结果</p>
          <p className="mt-1 text-xs font-semibold text-ink/40">{formatDate(currentAction.userResultSubmittedAt)}</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{currentAction.userResultNote}</p>
        </div>
      ) : null}

      {canComplete ? (
        <div className="mt-5 grid gap-3">
          <textarea
            value={completionNote}
            onChange={(event) => setCompletionNote(event.target.value)}
            maxLength={1000}
            className="min-h-24 rounded-[8px] border border-black/10 px-3 py-3 text-sm leading-6"
            placeholder="完成说明，可选"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(async () => {
                await postJson(`/api/admin/projects/${projectId}/actions/${currentAction.id}/complete`, {
                  completionNote,
                  expectedUpdatedAt: currentAction.updatedAt
                });
                setCompletionNote("");
                setMessage("当前步骤已确认完成。");
              })
            }
            className="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "处理中..." : "确认当前步骤完成"}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">
          {currentAction.responsibility === "USER" ? "等待用户提交当前步骤结果。" : "当前步骤尚未到可确认完成的状态。"}
        </div>
      )}

      {showCancel ? (
        <div className="mt-4 grid gap-3 rounded-[8px] border border-black/8 bg-paper p-4">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            取消原因
            <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={200} className="min-h-24 rounded-[8px] border border-black/10 bg-white px-3 py-3 text-sm font-normal leading-6" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  await postJson(`/api/admin/projects/${projectId}/actions/${currentAction.id}/cancel`, {
                    reason: cancelReason,
                    expectedUpdatedAt: currentAction.updatedAt
                  });
                  setCancelReason("");
                  setShowCancel(false);
                  setMessage("当前步骤已取消。");
                })
              }
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              确认取消
            </button>
            <button type="button" onClick={() => setShowCancel(false)} className="min-h-11 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
              返回
            </button>
          </div>
        </div>
      ) : currentAction.status === "ACTIVE" || currentAction.status === "WAITING_PLATFORM_CONFIRMATION" ? (
        <button type="button" onClick={() => setShowCancel(true)} className="mt-4 min-h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
          取消当前步骤
        </button>
      ) : null}

      {message ? <p className="mt-3 text-sm font-semibold text-ink/60">{message}</p> : null}
    </section>
  );
}
