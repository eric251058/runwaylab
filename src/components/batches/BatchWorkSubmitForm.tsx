"use client";

import { FormEvent, useState } from "react";

type BatchWorkSubmitFormProps = {
  batchId: string;
  works: Array<{
    id: string;
    title: string;
  }>;
};

export function BatchWorkSubmitForm({ batchId, works }: BatchWorkSubmitFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/batches/${batchId}/works`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workId: formData.get("workId"),
        nominationReason: formData.get("nominationReason")
      })
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(result.message ?? "提交失败，请稍后再试。");
      return;
    }

    setMessage(result.message ?? "作品已提交到批次。");
  }

  if (!works.length) {
    return <div className="rounded-[8px] bg-paper p-4 text-sm text-ink/55">你还没有可提交的公开作品。</div>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[8px] bg-paper p-4">
      <select name="workId" className="h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
        {works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
      </select>
      <textarea name="nominationReason" placeholder="为什么适合这个批次，可选" className="min-h-24 rounded-[6px] border border-black/10 bg-white px-3 py-3 text-sm" />
      <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "提交中..." : "提交作品参与"}
      </button>
      {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
      {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
