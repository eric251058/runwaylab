"use client";

import { useState, useTransition } from "react";
import { submitPresaleCampaignIntent } from "@/lib/presale-campaign-actions";

type PresaleCampaignFormProps = {
  campaignId: string;
  workId: string;
  source: "WORK_DETAIL" | "PRESALE_PAGE";
  sizeOptions: string[];
  colorOptions: string[];
};

export function PresaleCampaignForm({ campaignId, workId, source, sizeOptions, colorOptions }: PresaleCampaignFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await submitPresaleCampaignIntent(formData);
      setIsSuccess(result.ok);
      setMessage(result.message);
    });
  }

  const inputClass = "h-11 rounded-[6px] border border-black/10 bg-white px-3 text-sm text-ink outline-none focus:border-ink";
  const textareaClass = "min-h-24 rounded-[6px] border border-black/10 bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink";

  return (
    <form action={submit} className="grid gap-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="workId" value={workId} />
      <input type="hidden" name="source" value={source} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder="姓名（可选）" className={inputClass} />
        <input name="phone" placeholder="手机号（可选）" className={inputClass} />
        <input name="email" type="email" placeholder="邮箱（可选）" className={inputClass} />
        <input name="wechat" placeholder="微信（可选）" className={inputClass} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sizeOptions.length ? (
          <select name="size" defaultValue="" className={inputClass}>
            <option value="">选择尺码</option>
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        ) : (
          <input name="size" placeholder="尺码（可选）" className={inputClass} />
        )}

        {colorOptions.length ? (
          <select name="color" defaultValue="" className={inputClass}>
            <option value="">选择颜色</option>
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        ) : (
          <input name="color" placeholder="颜色（可选）" className={inputClass} />
        )}

        <input name="quantity" type="number" min={1} max={999} defaultValue={1} placeholder="数量" className={inputClass} />
      </div>

      <textarea name="note" placeholder="备注（可选，例如想要的长度、场景、预算）" className={textareaClass} />

      <button type="submit" disabled={isPending || isSuccess} className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "提交中..." : isSuccess ? "已提交" : "提交预售意向"}
      </button>

      {message ? <p className={`text-sm ${isSuccess ? "text-emerald-700" : "text-red-600"}`}>{message}</p> : null}
    </form>
  );
}
