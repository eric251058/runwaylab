"use client";

import { useState, useTransition } from "react";

export type DesignerIncubationItem = {
  id: string;
  kind: "presale" | "fabric" | "sample" | "factory" | "buyer" | "providerFabric" | "providerProposal" | "opportunityInterest";
  kindLabel: string;
  workId: string;
  workTitle: string;
  primary: string;
  company?: string | null;
  contact: string;
  summary: string;
  status: string;
  createdAt: string;
};

type DesignerIncubationPanelProps = {
  items: DesignerIncubationItem[];
};

const statusLabels: Record<string, string> = {
  PENDING: "待处理",
  INTERESTED: "感兴趣",
  SHORTLISTED: "已短选",
  SUBMITTED: "已提交",
  REVIEWED: "已查看",
  ACCEPTED: "已采纳",
  REJECTED: "暂不合适",
  NOT_SUITABLE: "暂不合适",
  WITHDRAWN: "已撤回",
  DECLINED: "暂不推进",
  CLOSED: "已关闭",
  INVALID: "违规/无效"
};

const statusOptions = [
  { value: "INTERESTED", label: "感兴趣" },
  { value: "ACCEPTED", label: "已采纳" },
  { value: "REJECTED", label: "暂不合适" }
];

const editableKinds = new Set(["presale", "fabric", "sample", "factory", "buyer"]);

function statusClass(status: string) {
  if (status === "ACCEPTED") return "bg-ink text-white";
  if (status === "INTERESTED" || status === "SHORTLISTED") return "bg-amber-100 text-amber-800";
  if (status === "REJECTED" || status === "NOT_SUITABLE") return "bg-zinc-100 text-ink/55";
  if (status === "WITHDRAWN") return "bg-paper text-ink/40";
  if (status === "INVALID") return "bg-red-100 text-red-700";
  return "bg-paper text-ink/58";
}

export function DesignerIncubationPanel({ items }: DesignerIncubationPanelProps) {
  const [localItems, setLocalItems] = useState(items);
  const [pendingId, setPendingId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateStatus(item: DesignerIncubationItem, status: string) {
    setPendingId(`${item.kind}:${item.id}:${status}`);
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/me/incubation/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind: item.kind,
          id: item.id,
          status
        })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(result.error ?? "状态更新失败");
        setPendingId("");
        return;
      }

      setLocalItems((current) => current.map((entry) => (entry.id === item.id && entry.kind === item.kind ? { ...entry, status } : entry)));
      setPendingId("");
    });
  }

  if (!localItems.length) {
    return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">你的作品还没有收到孵化方案或预售意向。</div>;
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      {localItems.map((item) => (
        <article key={`${item.kind}:${item.id}`} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_12px_36px_rgba(16,16,16,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{item.kindLabel}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabels[item.status] ?? item.status}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink">{item.primary}</h2>
              <p className="mt-1 text-sm text-ink/52">
                {item.company ? `${item.company} / ` : ""}
                {item.contact}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink/65">关联作品：{item.workTitle}</p>
              <p className="mt-2 text-sm leading-6 text-ink/58">{item.summary}</p>
              <p className="mt-2 text-xs text-ink/35">{item.createdAt}</p>
            </div>
            {editableKinds.has(item.kind) ? (
              <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isPending && pendingId === `${item.kind}:${item.id}:${option.value}`}
                    onClick={() => updateStatus(item, option.value)}
                    className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold text-ink disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
