"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROVIDER_RECOMMENDATION_TYPES } from "@/lib/provider-experience";

type ShowcaseOption = {
  id: string;
  title: string;
};

type ProviderWorkSupportDialogProps = {
  workId: string;
  providerType: string;
  showcaseItems: ShowcaseOption[];
};

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "提交失败，请稍后再试。";
}

export function ProviderWorkSupportDialog({ workId, showcaseItems }: ProviderWorkSupportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reasonLength, setReasonLength] = useState(0);

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/works/${workId}/provider-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationType: formData.get("recommendationType") || "SAMPLE",
          productName: formData.get("productName") || "",
          reason: formData.get("reason") || "",
          priceRange: formData.get("priceRange") || null,
          moq: formData.get("moq") || null,
          leadTime: formData.get("leadTime") || null,
          showcaseItemId: formData.get("showcaseItemId") || null
        })
      });

      if (!response.ok) throw new Error(await readMessage(response));

      setMessage("推荐已提交，等待设计师查看。");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Recommendation</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">推荐面料或服务</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">当前推荐会自动关联这件作品，设计师可在孵化进度中查看。</p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          {open ? "收起" : "推荐面料或服务"}
        </button>
      </div>

      {open ? (
        <form action={submit} className="mt-5 grid gap-3 rounded-[8px] bg-paper p-4">
          <select name="recommendationType" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
            {PROVIDER_RECOMMENDATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <input
            name="productName"
            maxLength={120}
            placeholder="推荐的产品或服务，例如：女装针织面料 / 小单打样 / 印花工艺"
            className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm"
          />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            一句话说明
            <textarea
              name="reason"
              required
              maxLength={600}
              onChange={(event) => setReasonLength(event.target.value.length)}
              placeholder="说明为什么适合这件作品。"
              className="min-h-28 rounded-[6px] border border-black/10 bg-white px-3 py-3 text-sm font-normal leading-6"
            />
            <span className="text-right text-xs font-normal text-ink/35">{reasonLength}/600</span>
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <input name="priceRange" placeholder="价格范围，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
            <input name="moq" placeholder="起订量，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
            <input name="leadTime" placeholder="交期，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
          </div>
          {showcaseItems.length ? (
            <select name="showcaseItemId" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
              <option value="">不关联案例</option>
              {showcaseItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          ) : null}
          <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "提交中..." : "提交推荐"}
          </button>
          {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
          {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
