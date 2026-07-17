import { normalizeEmail, normalizeLoginIdentifier, validateOptionalPhone } from "@/lib/user-contact";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

function assertOk(label: string, value: unknown) {
  if (!value) throw new Error(`${label}: expected truthy`);
  console.log(`PASS ${label}`);
}

function main() {
  assertEqual("email normalization", normalizeEmail(" USER@Example.COM "), "user@example.com");
  assertEqual("blank email", normalizeEmail(" "), null);
  assertEqual("phone normalization", validateOptionalPhone("13800138000").normalized, "+8613800138000");
  assertEqual("optional blank phone", validateOptionalPhone("").ok, true);
  assertEqual("invalid phone rejected", validateOptionalPhone("123").ok, false);

  const emailIdentifier = normalizeLoginIdentifier("USER@example.com");
  const phoneIdentifier = normalizeLoginIdentifier("13800138000");
  assertEqual("email identifier kind", emailIdentifier?.kind, "email");
  assertEqual("phone identifier kind", phoneIdentifier?.kind, "phone");
  assertOk("email rate limit key masked", emailIdentifier?.rateLimitKey.startsWith("email:"));
  assertOk("phone rate limit key masked", phoneIdentifier?.rateLimitKey.startsWith("phone:"));
  assertEqual("invalid identifier rejected", normalizeLoginIdentifier("not a phone"), null);
}

try {
  main();
} catch (error) {
  console.error("Identity V2.0B.3.4 tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
