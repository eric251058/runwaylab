"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/media/SafeImage";

export type FabricRecommendationProduct = {
  id: string;
  name: string;
  slug?: string | null;
  code?: string | null;
  imageUrl?: string | null;
  composition?: string | null;
  weight?: string | null;
  width?: string | null;
  usage?: string | null;
  moqNote?: string | null;
  defaultReason: string;
};

type FabricRecommendationDialogProps = {
  workId: string;
  workTitle: string;
  products: FabricRecommendationProduct[];
};

function productMeta(product: FabricRecommendationProduct) {
  return [product.composition, product.weight, product.width].filter(Boolean).join(" · ") || product.usage || "产品参数待补充";
}

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "提交失败，请稍后再试。";
}

export function FabricRecommendationDialog({ workId, workTitle, products }: FabricRecommendationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [reason, setReason] = useState(products[0]?.defaultReason ?? "");
  const [sampleAvailability, setSampleAvailability] = useState("需确认");
  const [moqText, setMoqText] = useState(products[0]?.moqNote ?? "");
  const [responseTime, setResponseTime] = useState("1 个工作日");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = products.find((product) => product.id === selectedId) ?? null;
  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) =>
      [product.name, product.code, product.composition, product.usage].some((value) => value?.toLowerCase().includes(keyword))
    );
  }, [products, query]);

  function selectProduct(product: FabricRecommendationProduct) {
    setSelectedId(product.id);
    setReason(product.defaultReason);
    setMoqText(product.moqNote ?? "");
    setMessage("");
    setError("");
  }

  async function submitRecommendation() {
    if (!selected) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/works/${workId}/fabric-recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fabricId: selected.id,
          reason,
          sampleAvailability,
          moqText,
          responseTime
        })
      });

      if (!response.ok) {
        throw new Error(await readMessage(response));
      }

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Fabric Supplier</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">推荐我的面料</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">从你的公开面料库里选择一款产品，推荐给作品作者。</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white"
        >
          {open ? "收起推荐" : "推荐我的面料"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 rounded-[8px] bg-paper p-4">
          {products.length ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索面料名称、成分或用途"
                  className="h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm"
                />
                <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredProducts.length ? filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className={`flex w-full gap-3 rounded-[8px] border p-3 text-left transition ${
                        selectedId === product.id ? "border-ink bg-white" : "border-black/8 bg-white/70 hover:border-ink/30"
                      }`}
                    >
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="aspect-[4/3] w-20 shrink-0 rounded-[6px] object-cover"
                        placeholder="暂无图片"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                        <span className="mt-1 block truncate text-xs text-ink/45">{productMeta(product)}</span>
                        {product.usage ? <span className="mt-1 block truncate text-xs text-ink/45">适用：{product.usage}</span> : null}
                      </span>
                    </button>
                  )) : (
                    <div className="rounded-[8px] bg-white p-4 text-sm text-ink/55">没有找到匹配的面料。</div>
                  )}
                </div>
              </div>

              <div className="rounded-[8px] bg-white p-4">
                {selected ? (
                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink/35">推荐给</p>
                      <h3 className="mt-1 text-lg font-semibold text-ink">{workTitle}</h3>
                      <p className="mt-1 text-sm text-ink/52">已选择：{selected.name}</p>
                    </div>
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      推荐理由
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={300}
                        minLength={10}
                        className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm font-normal leading-6"
                      />
                      <span className="text-right text-xs font-normal text-ink/35">{reason.length} / 300</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="grid gap-2 text-sm font-semibold text-ink">
                        样布
                        <select
                          value={sampleAvailability}
                          onChange={(event) => setSampleAvailability(event.target.value)}
                          className="h-11 rounded-[6px] border border-black/10 px-3 text-sm font-normal"
                        >
                          <option value="可寄样">可寄样</option>
                          <option value="暂不寄样">暂不寄样</option>
                          <option value="需确认">需确认</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                        MOQ
                        <input
                          value={moqText}
                          onChange={(event) => setMoqText(event.target.value)}
                          maxLength={80}
                          placeholder="如 50 米起订，可议"
                          className="h-11 rounded-[6px] border border-black/10 px-3 text-sm font-normal"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      回复时间
                      <select
                        value={responseTime}
                        onChange={(event) => setResponseTime(event.target.value)}
                        className="h-11 rounded-[6px] border border-black/10 px-3 text-sm font-normal"
                      >
                        <option value="当天">当天</option>
                        <option value="1 个工作日">1 个工作日</option>
                        <option value="3 个工作日内">3 个工作日内</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || reason.trim().length < 10}
                      onClick={submitRecommendation}
                      className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "提交中..." : "提交推荐"}
                    </button>
                    {message ? <p className="rounded-[6px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-800">{message}</p> : null}
                    {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] bg-white p-5 text-sm leading-6 text-ink/58">
              你的面料库还没有公开产品。先添加一款面料后，就可以在作品详情页快速推荐给设计师。
              <Link href="/provider-center/fabrics/new" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                添加面料产品
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
