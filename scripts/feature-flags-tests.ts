import { FEATURE_KEYS, isFeatureKey, parseFeatureFlagValue } from "@/lib/features";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

function main() {
  for (const key of FEATURE_KEYS) {
    assertEqual(`known key ${key}`, isFeatureKey(key), true);
  }

  assertEqual("unknown key rejected", isFeatureKey("feature.v999"), false);
  assertEqual("empty flag defaults off", parseFeatureFlagValue(undefined), false);
  assertEqual("invalid flag defaults off", parseFeatureFlagValue("definitely"), false);
  assertEqual("true flag", parseFeatureFlagValue("true"), true);
  assertEqual("enabled flag", parseFeatureFlagValue("enabled"), true);
  assertEqual("false flag", parseFeatureFlagValue("false"), false);
}

try {
  main();
} catch (error) {
  console.error("Feature flag tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
