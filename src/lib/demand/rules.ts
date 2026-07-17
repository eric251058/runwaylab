export type DemandInput = {
  preferredSizes?: unknown;
  preferredColors?: unknown;
  priceMin?: unknown;
  priceMax?: unknown;
  region?: unknown;
  notifyWhenAvailable?: unknown;
};

export type NormalizedDemandInput = {
  preferredSizes: string[];
  preferredColors: string[];
  priceMin: number | null;
  priceMax: number | null;
  region: string | null;
  notifyWhenAvailable: boolean;
};

function cleanText(value: unknown, maxLength = 40) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, maxLength) : null;
}

export function normalizeDemandList(value: unknown, maxItems = 8) {
  const rawItems = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\n，、]/) : [];
  const seen = new Set<string>();
  const items: string[] = [];

  for (const item of rawItems) {
    const text = cleanText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    items.push(text);
    if (items.length >= maxItems) break;
  }

  return items;
}

export function normalizeDemandPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 1000000) return null;
  return number;
}

export function normalizeDemandInput(input: DemandInput): { ok: true; data: NormalizedDemandInput } | { ok: false; error: string } {
  const priceMin = normalizeDemandPrice(input.priceMin);
  const priceMax = normalizeDemandPrice(input.priceMax);

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    return { ok: false, error: "价格区间填写有误。" };
  }

  return {
    ok: true,
    data: {
      preferredSizes: normalizeDemandList(input.preferredSizes),
      preferredColors: normalizeDemandList(input.preferredColors),
      priceMin,
      priceMax,
      region: cleanText(input.region, 60),
      notifyWhenAvailable: input.notifyWhenAvailable === undefined ? true : Boolean(input.notifyWhenAvailable)
    }
  };
}

export function demandSummary(input: Pick<NormalizedDemandInput, "preferredSizes" | "preferredColors" | "priceMin" | "priceMax" | "region">) {
  const parts = [
    input.preferredSizes.length ? `尺码 ${input.preferredSizes.join("、")}` : null,
    input.preferredColors.length ? `颜色 ${input.preferredColors.join("、")}` : null,
    input.priceMin !== null || input.priceMax !== null ? `预算 ${input.priceMin ?? 0}-${input.priceMax ?? "不限"} 元` : null,
    input.region ? `地区 ${input.region}` : null
  ].filter(Boolean);

  return parts.join(" / ") || "已表达想要意向";
}
