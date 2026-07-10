"use client";

import { FormEvent, useState } from "react";

const interestTypes = ["INTERESTED", "NEED_MORE_INFO", "CAN_SAMPLE", "CAN_SMALL_BATCH", "CAN_SCALE", "NOT_SUITABLE"] as const;
const interestTypeLabels: Record<(typeof interestTypes)[number], string> = {
  INTERESTED: "感兴趣",
  NEED_MORE_INFO: "需要补充资料",
  CAN_SAMPLE: "可以打样",
  CAN_SMALL_BATCH: "可以承接小单",
  CAN_SCALE: "可以承接大货",
  NOT_SUITABLE: "暂不适合"
};

type ProviderOpportunityInterestFormProps = {
  workId: string;
};

export function ProviderOpportunityInterestForm({ workId }: ProviderOpportunityInterestFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/providers/opportunities/${workId}/interest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        interestType: formData.get("interestType"),
        note: formData.get("note"),
        expectedPriceMin: formData.get("expectedPriceMin"),
        expectedPriceMax: formData.get("expectedPriceMax"),
        minimumQuantity: formData.get("minimumQuantity"),
        leadDays: formData.get("leadDays")
      })
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(data?.message ?? "提交失败，请稍后再试。");
      return;
    }

    setMessage(data?.message ?? "服务商意向已提交。");
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-2 rounded-[8px] bg-white p-3">
      <select name="interestType" defaultValue="INTERESTED" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
        {interestTypes.map((type) => (
          <option key={type} value={type}>{interestTypeLabels[type]}</option>
        ))}
      </select>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="expectedPriceMin" placeholder="预计最低价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="expectedPriceMax" placeholder="预计最高价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="minimumQuantity" placeholder="最低数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="leadDays" placeholder="预计周期 / 天" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      </div>
      <textarea name="note" placeholder="简短说明，可选" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
      <button disabled={busy} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "提交中..." : "提交意向"}
      </button>
      {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
      {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
