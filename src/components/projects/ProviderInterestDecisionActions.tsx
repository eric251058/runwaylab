"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DecisionStatus = "SHORTLISTED" | "DECLINED";

type ProviderInterestDecisionActionsProps = {
  workId: string;
  interestId: string;
  currentStatus: string;
  collaborationProjectId?: string | null;
};

export function ProviderInterestDecisionActions({
  workId,
  interestId,
  currentStatus,
  collaborationProjectId
}: ProviderInterestDecisionActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<DecisionStatus | null>(null);
  const [error, setError] = useState("");

  async function decide(status: DecisionStatus) {
    setBusy(status);
    setError("");

    const response = await fetch(`/api/me/projects/${workId}/provider-interests/${interestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setError(data?.message ?? "操作失败，请稍后再试。");
      return;
    }

    if (status === "SHORTLISTED" && data?.collaborationProjectId) {
      router.push("/me/projects/collaboration/" + data.collaborationProjectId);
      return;
    }

    router.refresh();
  }

  if (currentStatus === "SHORTLISTED" && collaborationProjectId) {
    return (
      <div className="mt-4">
        <Link
          href={"/me/projects/collaboration/" + collaborationProjectId}
          className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          打开洽谈空间
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("SHORTLISTED")}
          disabled={Boolean(busy) || currentStatus === "SHORTLISTED"}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === "SHORTLISTED" ? "处理中…" : currentStatus === "SHORTLISTED" ? "已进入洽谈" : "邀请进入洽谈"}
        </button>
        <button
          type="button"
          onClick={() => decide("DECLINED")}
          disabled={Boolean(busy) || currentStatus === "DECLINED" || currentStatus === "SHORTLISTED"}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === "DECLINED" ? "处理中…" : currentStatus === "DECLINED" ? "已婉拒" : "暂不合作"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
