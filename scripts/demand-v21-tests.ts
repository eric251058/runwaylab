import { demandSummary, normalizeDemandInput, normalizeDemandList, normalizeDemandPrice } from "@/lib/demand/rules";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

function main() {
  assertEqual("list trims and dedupes", normalizeDemandList("S, M，M、L").join("|"), "S|M|L");
  assertEqual("valid price", normalizeDemandPrice("399"), 399);
  assertEqual("invalid decimal price rejected", normalizeDemandPrice("399.5"), null);

  const normalized = normalizeDemandInput({
    preferredSizes: "S, M",
    preferredColors: "黑色，米白",
    priceMin: "299",
    priceMax: "599",
    region: " 上海 ",
    notifyWhenAvailable: false
  });
  if (!normalized.ok) throw new Error("expected demand normalization success");
  assertEqual("sizes", normalized.data.preferredSizes.join(","), "S,M");
  assertEqual("colors", normalized.data.preferredColors.join(","), "黑色,米白");
  assertEqual("notify false", normalized.data.notifyWhenAvailable, false);
  assertEqual("summary", demandSummary(normalized.data), "尺码 S、M / 颜色 黑色、米白 / 预算 299-599 元 / 地区 上海");

  const invalid = normalizeDemandInput({ priceMin: "900", priceMax: "100" });
  assertEqual("invalid price interval", invalid.ok, false);
}

try {
  main();
} catch (error) {
  console.error("Demand V2.1 tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
