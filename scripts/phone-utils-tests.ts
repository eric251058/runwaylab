import { maskPhone, normalizePhone, validatePhone } from "@/lib/phone";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
  console.log(`PASS ${label}`);
}

function assertInvalid(label: string, value: string) {
  const result = validatePhone(value);
  if (result.ok) {
    throw new Error(`${label}: expected invalid phone`);
  }
  console.log(`PASS ${label}`);
}

function main() {
  assertEqual("mainland plain", normalizePhone("13800138000"), "+8613800138000");
  assertEqual("mainland plus", normalizePhone("+8613800138000"), "+8613800138000");
  assertEqual("mainland country code with space", normalizePhone("86 13800138000"), "+8613800138000");
  assertEqual("spaces and dashes", normalizePhone("+86 138-0013-8000"), "+8613800138000");
  assertInvalid("invalid mainland prefix", "12800138000");
  assertInvalid("too short", "1380013");
  assertInvalid("too long", "+861380013800012345");
  assertEqual("empty value", normalizePhone(""), null);
  assertEqual("masked mainland", maskPhone("+8613800138000"), "+86 138****8000");
  assertEqual("international phone", normalizePhone("+14155552671"), "+14155552671");
}

try {
  main();
} catch (error) {
  console.error("Phone utils tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
