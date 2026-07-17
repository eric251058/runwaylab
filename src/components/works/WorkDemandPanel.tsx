"use client";

import { useState, useTransition } from "react";

type WorkDemandPanelProps = {
  workId: string;
  initialCount: number;
  isLoggedIn: boolean;
};

export function WorkDemandPanel({ workId, initialCount, isLoggedIn }: WorkDemandPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function submitDemand(formData: FormData) {
    setMessage(null);
    const payload = {
      preferredSizes: formData.get("preferredSizes"),
      preferredColors: formData.get("preferredColors"),
      priceMin: formData.get("priceMin"),
      priceMax: formData.get("priceMax"),
      region: formData.get("region"),
      notifyWhenAvailable: formData.get("notifyWhenAvailable") === "on"
    };

    startTransition(async () => {
      const response = await fetch(`/api/works/${workId}/demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(data?.error ?? "提交失败，请稍后再试。");
        return;
      }

      setCount((value) => Math.max(value, initialCount) + (initialCount === 0 ? 1 : 0));
      setMessage("已记录你的想买意向，不会产生付款或订单。");
    });
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Demand</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">想要这件作品</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">告诉设计师你想要的尺码、颜色和预算。这里只收集意向，不付款、不生成订单。</p>
        </div>
        <span className="w-fit rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink/55">{count} 人想要</span>
      </div>

      {isLoggedIn ? (
        <form action={submitDemand} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="preferredSizes" placeholder="尺码，例如 S, M, L" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink" />
          <input name="preferredColors" placeholder="颜色，例如 黑色, 米白" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink" />
          <input name="priceMin" inputMode="numeric" placeholder="最低预算，元" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink" />
          <input name="priceMax" inputMode="numeric" placeholder="最高预算，元" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink" />
          <input name="region" placeholder="所在城市，可选" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink md:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-ink/56 md:col-span-2">
            <input name="notifyWhenAvailable" type="checkbox" defaultChecked className="size-4 rounded border-black/20" />
            有新进展时提醒我
          </label>
          <button disabled={isPending} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
            {isPending ? "提交中..." : "提交想买意向"}
          </button>
        </form>
      ) : (
        <a href={`/login?next=/works/${workId}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          登录后提交意向
        </a>
      )}

      {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
    </section>
  );
}
