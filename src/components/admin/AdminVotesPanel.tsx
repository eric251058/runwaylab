"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { WORK_VOTE_LABELS, WORK_VOTE_STATUS_LABELS } from "@/lib/user-contributions";

export type AdminVoteItem = {
  id: string;
  workTitle: string;
  type: string;
  status: string;
  sourceLabel: string;
  adminNote: string | null;
  createdAt: string;
};

type AdminVotesPanelProps = {
  votes: AdminVoteItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminVotesPanel({ votes }: AdminVotesPanelProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const updateVote = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusyId(id);
    setNotice("");

    const response = await fetch(`/api/admin/votes/${id}`, {
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
      setNotice(data?.message ?? "投票状态更新失败。");
      return;
    }

    setNotice("投票状态已更新。");
    router.refresh();
  };

  if (!votes.length) {
    return <div className="rounded-[8px] bg-paper p-4 text-sm text-ink/55">暂无投票记录。</div>;
  }

  return (
    <div className="space-y-3">
      {notice ? <div className="rounded-[6px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-800">{notice}</div> : null}
      {votes.map((vote) => (
        <form key={vote.id} onSubmit={(event) => updateVote(event, vote.id)} className="rounded-[8px] bg-paper p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{WORK_VOTE_LABELS[vote.type] ?? vote.type}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{WORK_VOTE_STATUS_LABELS[vote.status] ?? vote.status}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">来源标识 {vote.sourceLabel}</span>
              </div>
              <p className="mt-3 font-semibold text-ink">{vote.workTitle}</p>
              <p className="mt-1 text-xs text-ink/45">提交时间：{formatDate(vote.createdAt)}</p>
            </div>
            <div className="grid gap-2 lg:w-80">
              <input name="adminNote" defaultValue={vote.adminNote ?? ""} placeholder="管理员备注" className="h-10 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <button name="status" value="HIDDEN" disabled={busyId === vote.id} className="h-10 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-50">
                  隐藏投票
                </button>
                <button name="status" value="ACTIVE" disabled={busyId === vote.id} className="h-10 rounded-full bg-ink px-3 text-sm font-semibold text-white disabled:opacity-50">
                  恢复投票
                </button>
              </div>
            </div>
          </div>
        </form>
      ))}
    </div>
  );
}
