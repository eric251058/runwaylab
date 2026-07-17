import { FEATURE_KEYS, FEATURE_LABELS, getFeatureFlags } from "@/lib/features";
import { updateFeatureFlag } from "@/lib/feature-actions";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage() {
  const flags = await getFeatureFlags();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Feature Flags</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">功能开关</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
          新能力默认关闭。打开前请先确认对应 migration 已在生产执行，并完成手工验证。
        </p>
      </header>

      <section className="grid gap-3">
        {FEATURE_KEYS.map((key) => (
          <form key={key} action={updateFeatureFlag} className="flex flex-col gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <input type="hidden" name="key" value={key} />
            <div>
              <h2 className="font-semibold text-ink">{FEATURE_LABELS[key]}</h2>
              <p className="mt-1 text-xs text-ink/45">{key}</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-ink/60">
              <input name="enabled" type="checkbox" defaultChecked={flags[key]} className="size-5 accent-black" />
              {flags[key] ? "已开启" : "已关闭"}
            </label>
            <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
          </form>
        ))}
      </section>
    </div>
  );
}
