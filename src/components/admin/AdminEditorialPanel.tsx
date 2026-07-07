"use client";

import { useState, useTransition } from "react";

export type EditorialWorkItem = {
  id: string;
  title: string;
  author: string;
  status: string;
  heatScore: number;
  picks: string[];
  isFeatured: boolean;
  isEditorPick: boolean;
};

type AdminEditorialPanelProps = {
  works: EditorialWorkItem[];
};

const actions = [
  { type: "HOME_FEATURED", label: "首页精选" },
  { type: "EDITOR_PICK", label: "编辑推荐" },
  { type: "HOT_WORK", label: "热门作品" },
  { type: "PRESALE_PICK", label: "预售候选" },
  { type: "INCUBATION_PICK", label: "孵化候选" },
  { type: "HIDDEN", label: "隐藏低质" },
  { type: "VIOLATION", label: "标记违规" }
];

export function AdminEditorialPanel({ works }: AdminEditorialPanelProps) {
  const [localWorks, setLocalWorks] = useState(works);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyAction(work: EditorialWorkItem, type: string) {
    const enabled = !(type !== "HIDDEN" && type !== "VIOLATION" && work.picks.includes(type));
    setPendingId(`${work.id}:${type}`);
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/admin/editorial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workId: work.id,
          type,
          enabled
        })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(result.error ?? "操作失败");
        setPendingId("");
        return;
      }

      setLocalWorks((current) =>
        current.map((item) => {
          if (item.id !== work.id) return item;
          if (type === "HIDDEN" || type === "VIOLATION") {
            return { ...item, status: "HIDDEN" };
          }
          return {
            ...item,
            picks: enabled ? Array.from(new Set([...item.picks, type])) : item.picks.filter((pick) => pick !== type),
            isFeatured: type === "HOME_FEATURED" ? enabled : item.isFeatured,
            isEditorPick: type === "EDITOR_PICK" ? enabled : item.isEditorPick
          };
        })
      );
      setPendingId("");
    });
  }

  if (!localWorks.length) {
    return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无可运营作品。</div>;
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      {localWorks.map((work) => (
        <article key={work.id} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_12px_36px_rgba(16,16,16,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">热度 {work.heatScore}</span>
                {work.picks.map((pick) => (
                  <span key={pick} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">
                    {pick}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink">{work.title}</h2>
              <p className="mt-1 text-sm text-ink/52">{work.author} / {work.status}</p>
            </div>
            <div className="flex max-w-xl shrink-0 flex-wrap gap-2 lg:justify-end">
              {actions.map((action) => (
                <button
                  key={action.type}
                  type="button"
                  disabled={isPending && pendingId === `${work.id}:${action.type}`}
                  onClick={() => applyAction(work, action.type)}
                  className={`h-9 rounded-full border px-3 text-xs font-semibold disabled:opacity-50 ${
                    work.picks.includes(action.type) ? "border-ink bg-ink text-white" : "border-black/10 text-ink"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
