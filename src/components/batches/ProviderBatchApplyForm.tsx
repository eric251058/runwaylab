"use client";

import { FormEvent, useState } from "react";

const roleOptions = [
  { value: "FABRIC_SUPPORT", label: "面料支持" },
  { value: "SAMPLE_SUPPORT", label: "打样支持" },
  { value: "PRODUCTION_SUPPORT", label: "生产支持" },
  { value: "BUYER", label: "买手" },
  { value: "SPONSOR", label: "赞助方" },
  { value: "MENTOR", label: "导师" },
  { value: "OTHER", label: "其他" }
] as const;

type ProviderBatchApplyFormProps = {
  batchId: string;
};

export function ProviderBatchApplyForm({ batchId }: ProviderBatchApplyFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/providers/batches/${batchId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: formData.get("role"),
        note: formData.get("note"),
        minimumQuantity: formData.get("minimumQuantity"),
        maximumQuantity: formData.get("maximumQuantity"),
        expectedPriceMin: formData.get("expectedPriceMin"),
        expectedPriceMax: formData.get("expectedPriceMax"),
        sampleLeadDays: formData.get("sampleLeadDays"),
        productionLeadDays: formData.get("productionLeadDays")
      })
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(result.message ?? "申请失败，请稍后再试。");
      return;
    }

    setMessage(result.message ?? "批次参与申请已提交。");
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[8px] bg-white p-4">
      <select name="role" defaultValue="SAMPLE_SUPPORT" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
        {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
      </select>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="minimumQuantity" placeholder="最低数量" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="maximumQuantity" placeholder="最高数量" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="expectedPriceMin" placeholder="预计最低价" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="expectedPriceMax" placeholder="预计最高价" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="sampleLeadDays" placeholder="打样周期 / 天" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="productionLeadDays" placeholder="生产周期 / 天" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
      </div>
      <textarea name="note" placeholder="简短说明，可选" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
      <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "提交中..." : "申请参与批次"}
      </button>
      {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
      {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
