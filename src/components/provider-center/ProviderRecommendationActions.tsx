"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ProviderRecommendationActionsProps = {
  workId: string;
  recommendationId: string;
  canWithdraw: boolean;
};

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "操作失败，请稍后再试。";
}

export function ProviderRecommendationActions({ workId, recommendationId, canWithdraw }: ProviderRecommendationActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function withdraw() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/works/${workId}/fabric-recommendations/${recommendationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "WITHDRAWN" })
      });

      if (!response.ok) {
        setError(await readMessage(response));
        return;
      }

      setMessage("推荐已撤回。");
      router.refresh();
    });
  }

  if (!canWithdraw) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={withdraw}
        disabled={isPending}
        className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-ink disabled:opacity-50"
      >
        {isPending ? "处理中..." : "撤回推荐"}
      </button>
      {message ? <p className="mt-2 rounded-[6px] bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-800">{message}</p> : null}
      {error ? <p className="mt-2 rounded-[6px] bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
