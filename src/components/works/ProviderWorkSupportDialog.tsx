"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SupportProviderType = "SAMPLE_STUDIO" | "FACTORY";

type ShowcaseOption = {
  id: string;
  title: string;
};

type ProviderWorkSupportDialogProps = {
  workId: string;
  providerType: SupportProviderType;
  showcaseItems: ShowcaseOption[];
};

function copyForType(type: SupportProviderType) {
  if (type === "FACTORY") {
    return {
      title: "提供生产支持",
      description: "提交可承接数量、预计周期和简短说明，设计师可在我的进展中查看。",
      quantityLabel: "可承接数量",
      quantityPlaceholder: "如 100 件起、30 件可议",
      timePlaceholder: "如 15-25 天"
    };
  }
  return {
    title: "提供打样支持",
    description: "提交服务说明、预计周期和可选案例，设计师可在我的进展中查看。",
    quantityLabel: "服务范围",
    quantityPlaceholder: "如 单件样衣、制版另计",
    timePlaceholder: "如 3-5 天"
  };
}

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "提交失败，请稍后再试。";
}

export function ProviderWorkSupportDialog({ workId, providerType, showcaseItems }: ProviderWorkSupportDialogProps) {
  const router = useRouter();
  const copy = copyForType(providerType);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/works/${workId}/provider-proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          showcaseItemId: formData.get("showcaseItemId") || null,
          message: formData.get("message") || "",
          estimatedTime: formData.get("estimatedTime") || null,
          quantity: formData.get("quantity") || null
        })
      });

      if (!response.ok) throw new Error(await readMessage(response));

      setMessage("支持方案已提交，等待设计师查看。");
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Support</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">{copy.description}</p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          {open ? "收起" : copy.title}
        </button>
      </div>

      {open ? (
        <form action={submit} className="mt-5 grid gap-3 rounded-[8px] bg-paper p-4">
          <select name="showcaseItemId" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
            <option value="">不关联案例</option>
            {showcaseItems.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
          <textarea name="message" required minLength={10} maxLength={600} placeholder="服务说明，例如可提供的支持、适合的品类、需要设计师补充的信息。" className="min-h-28 rounded-[6px] border border-black/10 bg-white px-3 py-3 text-sm leading-6" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="estimatedTime" placeholder={`预计周期，${copy.timePlaceholder}`} className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
            <input name="quantity" placeholder={`${copy.quantityLabel}，${copy.quantityPlaceholder}`} className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
          </div>
          <button disabled={busy} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "提交中..." : "提交支持方案"}
          </button>
          {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
          {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
