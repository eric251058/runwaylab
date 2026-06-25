"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestStatusClass, requestStatusLabel } from "@/lib/requests/status";

export type AdminRequestItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  workTitle?: string | null;
  userName: string;
  contact?: string | null;
  detail?: string | null;
};

type AdminRequestsPanelProps = {
  items: AdminRequestItem[];
  endpointBase: string;
  statusOptions: Array<{ value: string; label: string }>;
  emptyText: string;
};

export function AdminRequestsPanel({ items, endpointBase, statusOptions, emptyText }: AdminRequestsPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; adminNote: string }>>(() =>
    Object.fromEntries(items.map((item) => [item.id, { status: item.status, adminNote: item.adminNote ?? "" }]))
  );

  const update = async (id: string) => {
    setBusyId(id);
    const draft = drafts[id];
    const response = await fetch(`${endpointBase}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(draft)
    });
    setBusyId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.message ?? "更新失败。");
      return;
    }

    router.refresh();
  };

  if (!items.length) {
    return <div className="rounded-[6px] border border-dashed border-black/15 bg-white px-6 py-12 text-center text-sm text-ink/50">{emptyText}</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const draft = drafts[item.id] ?? { status: item.status, adminNote: item.adminNote ?? "" };
        return (
          <article key={item.id} className="grid gap-4 rounded-[6px] bg-white p-4 shadow-[0_18px_50px_rgba(16,16,16,0.08)] lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusClass(item.status)}`}>{requestStatusLabel(item.status)}</span>
                <span className="text-xs text-ink/40">{new Intl.DateTimeFormat("zh-CN").format(new Date(item.createdAt))}</span>
              </div>
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-ink/55">{item.subtitle}</p>
              <div className="mt-3 grid gap-1 text-xs text-ink/50">
                <span>用户：{item.userName}</span>
                {item.contact ? <span>联系方式：{item.contact}</span> : null}
                {item.workTitle ? <span>关联作品：{item.workTitle}</span> : null}
                {item.detail ? <span>详情：{item.detail}</span> : null}
              </div>
              {item.adminNote ? <p className="mt-3 rounded-[6px] bg-paper px-3 py-2 text-xs text-ink/55">当前备注：{item.adminNote}</p> : null}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">状态</span>
                <select
                  value={draft.status}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, status: event.target.value } }))}
                  className="mt-2 h-10 w-full rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">后台备注</span>
                <textarea
                  value={draft.adminNote}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, adminNote: event.target.value } }))}
                  className="mt-2 min-h-24 w-full rounded-[6px] border border-black/10 bg-paper p-3 text-sm outline-none"
                />
              </label>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => update(item.id)}
                className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busyId === item.id ? "保存中..." : "保存处理结果"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
