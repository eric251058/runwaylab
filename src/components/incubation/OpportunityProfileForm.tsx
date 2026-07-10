"use client";

import { FormEvent, useState } from "react";

const stageOptions = [
  { value: "DISPLAY_ONLY", label: "仅展示" },
  { value: "SAMPLE_READY", label: "申请进入打样" },
  { value: "SMALL_BATCH_READY", label: "申请进入小单" }
] as const;

const sampleStatusOptions = [
  { value: "NOT_STARTED", label: "尚未开始" },
  { value: "PLANNING", label: "准备中" },
  { value: "IN_PROGRESS", label: "打样中" },
  { value: "COMPLETED", label: "样衣完成" }
] as const;

const fabricStatusOptions = [
  { value: "UNKNOWN", label: "尚未明确" },
  { value: "RECOMMENDED", label: "已有推荐" },
  { value: "SELECTED", label: "已选定" },
  { value: "CONFIRMED", label: "已确认" }
] as const;

type OpportunityProfileFormProps = {
  workId: string;
  initialProfile?: {
    stage?: string | null;
    targetQuantity?: number | null;
    targetRetailPrice?: string | null;
    sampleBudget?: string | null;
    sampleStatus?: string | null;
    fabricStatus?: string | null;
    targetLaunchDate?: string | null;
    expectedReorder?: boolean | null;
    designerNote?: string | null;
  } | null;
};

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const text = textValue(formData, key);
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function OpportunityProfileForm({ workId, initialProfile }: OpportunityProfileFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/me/works/${workId}/opportunity`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stage: textValue(formData, "stage"),
        targetQuantity: numberValue(formData, "targetQuantity"),
        targetRetailPrice: numberValue(formData, "targetRetailPrice"),
        sampleBudget: numberValue(formData, "sampleBudget"),
        sampleStatus: textValue(formData, "sampleStatus"),
        fabricStatus: textValue(formData, "fabricStatus"),
        targetLaunchDate: textValue(formData, "targetLaunchDate"),
        expectedReorder: formData.get("expectedReorder") === "on",
        designerNote: textValue(formData, "designerNote")
      })
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(result.message ?? "保存失败，请稍后再试。");
      return;
    }

    setMessage("机会资料已保存，管理员审核后会决定是否进入机会池。");
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-[8px] bg-white p-4 md:grid-cols-3">
      <div className="md:col-span-3">
        <p className="text-sm font-semibold text-ink">项目机会资料</p>
        <p className="mt-1 text-xs leading-5 text-ink/45">填写目标数量、样衣和面料状态，帮助平台判断是否适合推给服务商。本表不会生成真实订单。</p>
      </div>
      <select name="stage" defaultValue={initialProfile?.stage ?? "DISPLAY_ONLY"} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
        {stageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <input name="targetQuantity" defaultValue={initialProfile?.targetQuantity ?? ""} placeholder="目标数量" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetRetailPrice" defaultValue={initialProfile?.targetRetailPrice ?? ""} placeholder="目标零售价" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="sampleBudget" defaultValue={initialProfile?.sampleBudget ?? ""} placeholder="打样预算" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
      <select name="sampleStatus" defaultValue={initialProfile?.sampleStatus ?? "NOT_STARTED"} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
        {sampleStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <select name="fabricStatus" defaultValue={initialProfile?.fabricStatus ?? "UNKNOWN"} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
        {fabricStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <input name="targetLaunchDate" type="date" defaultValue={initialProfile?.targetLaunchDate ?? ""} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
      <label className="flex min-h-11 items-center gap-2 rounded-[6px] border border-black/10 px-3 text-sm text-ink/65">
        <input name="expectedReorder" type="checkbox" defaultChecked={Boolean(initialProfile?.expectedReorder)} />
        预计后续可能补单
      </label>
      <textarea name="designerNote" defaultValue={initialProfile?.designerNote ?? ""} maxLength={500} placeholder="项目补充说明，可选" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
      <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-3">
        {busy ? "保存中..." : "保存机会资料"}
      </button>
      {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800 md:col-span-3">{message}</p> : null}
      {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-3">{error}</p> : null}
    </form>
  );
}
