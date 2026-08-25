"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProjectNegotiationComposer({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const value = body.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");

    const response = await fetch("/api/me/projects/collaboration/" + projectId + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: value })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(data?.message ?? "消息发送失败，请稍后再试。");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <label htmlFor="negotiation-message" className="text-sm font-semibold text-ink">发送合作消息</label>
      <textarea
        id="negotiation-message"
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, 1200))}
        rows={4}
        placeholder="建议明确：合作范围、报价是否含税运、交期、样品标准和下一步。 "
        className="mt-2 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-black/30"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ink/40">{body.length}/1200</p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "发送中…" : "发送消息"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
