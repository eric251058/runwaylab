"use client";

import { useState, useTransition } from "react";

export type AdminIncubationItem = {
  id: string;
  target: "work" | "presale" | "fabric" | "sample" | "factory" | "buyer";
  label: string;
  title: string;
  subtitle?: string;
  contact?: string;
  summary: string;
  status: string;
  createdAt: string;
};

type AdminIncubationPanelProps = {
  items: AdminIncubationItem[];
};

const workStatusOptions = [
  { value: "DISPLAYING", label: "展示中" },
  { value: "CANDIDATE", label: "孵化候选" },
  { value: "FABRIC_MATCHING", label: "寻找面料中" },
  { value: "SAMPLE_MATCHING", label: "寻找打样中" },
  { value: "PRODUCTION_MATCHING", label: "寻找生产中" },
  { value: "PRESALE_TESTING", label: "预售意向中" },
  { value: "COLLABORATION_REACHED", label: "已达成合作" }
];

const proposalStatusOptions = [
  { value: "PENDING", label: "待处理" },
  { value: "INTERESTED", label: "感兴趣" },
  { value: "ACCEPTED", label: "已采纳" },
  { value: "REJECTED", label: "暂不合适" },
  { value: "INVALID", label: "违规/无效" }
];

const statusLabels = [...workStatusOptions, ...proposalStatusOptions].reduce<Record<string, string>>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

function statusClass(status: string) {
  if (status === "ACCEPTED" || status === "COLLABORATION_REACHED") return "bg-ink text-white";
  if (status === "INTERESTED" || status === "CANDIDATE") return "bg-amber-100 text-amber-800";
  if (status === "INVALID" || status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-paper text-ink/58";
}

export function AdminIncubationPanel({ items }: AdminIncubationPanelProps) {
  const [localItems, setLocalItems] = useState(items);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateStatus(item: AdminIncubationItem, status: string) {
    setPendingId(`${item.target}:${item.id}:${status}`);
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/admin/incubation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: item.target,
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

      setLocalItems((current) => current.map((entry) => (entry.id === item.id && entry.target === item.target ? { ...entry, status } : entry)));
      setPendingId("");
    });
  }

  if (!localItems.length) {
    return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无孵化记录或方案提交。</div>;
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      {localItems.map((item) => {
        const options = item.target === "work" ? workStatusOptions : proposalStatusOptions;
        return (
          <article key={`${item.target}:${item.id}`} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_12px_36px_rgba(16,16,16,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{item.label}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabels[item.status] ?? item.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                {item.subtitle ? <p className="mt-1 text-sm text-ink/55">{item.subtitle}</p> : null}
                {item.contact ? <p className="mt-1 text-sm font-semibold text-ink/60">联系方式：{item.contact}</p> : null}
                <p className="mt-2 text-sm leading-6 text-ink/58">{item.summary}</p>
                <p className="mt-2 text-xs text-ink/35">{item.createdAt}</p>
              </div>
              <div className="flex max-w-xl shrink-0 flex-wrap gap-2 lg:justify-end">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isPending && pendingId === `${item.target}:${item.id}:${option.value}`}
                    onClick={() => updateStatus(item, option.value)}
                    className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold text-ink disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
