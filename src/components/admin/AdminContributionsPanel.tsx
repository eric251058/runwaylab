"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CONTRIBUTION_PERSONA_LABELS, CONTRIBUTION_STATUS_LABELS, CONTRIBUTION_STATUS_OPTIONS, CONTRIBUTION_TYPE_LABELS } from "@/lib/user-contributions";

export type AdminContributionItem = {
  id: string;
  workTitle: string;
  persona: string;
  type: string;
  content: string;
  name: string | null;
  contact: string | null;
  status: string;
  adminNote: string | null;
  sourceLabel: string;
  riskFlags: string[];
  createdAt: string;
};

type AdminContributionsPanelProps = {
  contributions: AdminContributionItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminContributionsPanel({ contributions }: AdminContributionsPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const updateContribution = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusyId(id);
    setNotice("");

    const response = await fetch(`/api/admin/contributions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: formData.get("status"),
        adminNote: formData.get("adminNote")
      })
    });

    setBusyId("");

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setNotice(data?.message ?? "更新失败，请稍后再试。");
      return;
    }

    setNotice("用户建议状态已更新。");
    router.refresh();
  };

  if (!contributions.length) {
    return (
      <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">
        暂无用户建议。作品详情页提交后，会在这里集中查看。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notice ? <div className="rounded-[6px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">{notice}</div> : null}
      {contributions.map((item) => (
        <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{CONTRIBUTION_STATUS_LABELS[item.status] ?? item.status}</span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{CONTRIBUTION_PERSONA_LABELS[item.persona] ?? item.persona}</span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{CONTRIBUTION_TYPE_LABELS[item.type] ?? item.type}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink">{item.workTitle}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/64">{item.content}</p>
              <p className="mt-3 text-xs leading-5 text-ink/45">
                {[item.name && `姓名 ${item.name}`, item.contact && `联系方式 ${item.contact}`, `提交时间 ${formatDate(item.createdAt)}`].filter(Boolean).join(" / ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/50">来源标识 {item.sourceLabel}</span>
                {item.riskFlags.map((flag) => (
                  <span key={flag} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    {flag}
                  </span>
                ))}
              </div>
              {item.adminNote ? <p className="mt-2 rounded-[6px] bg-paper px-3 py-2 text-xs leading-5 text-ink/55">管理员备注：{item.adminNote}</p> : null}
            </div>
            <form onSubmit={(event) => updateContribution(event, item.id)} className="grid content-start gap-2">
              <textarea name="adminNote" defaultValue={item.adminNote ?? ""} placeholder="管理员备注" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                {CONTRIBUTION_STATUS_OPTIONS.filter((option) => option.value !== "NEW").map((option) => (
                  <button key={option.value} name="status" value={option.value} disabled={busyId === item.id} className="h-10 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-50">
                    {option.value === "VALUABLE" ? "标记有价值" : option.value === "REVIEWED" ? "标记已查看" : option.value === "PROCESSED" ? "标记已处理" : "忽略"}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
