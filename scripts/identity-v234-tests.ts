import { normalizeEmail, normalizeLoginIdentifier, validateOptionalPhone } from "@/lib/user-contact";
import { readFileSync } from "node:fs";
import { buildLoginPayload, buildRegisterPayload, defaultRegisterContactMode } from "@/lib/auth/identity-ui";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

function assertOk(label: string, value: unknown) {
  if (!value) throw new Error(`${label}: expected truthy`);
  console.log(`PASS ${label}`);
}

function assertHasKey(label: string, value: Record<string, unknown>, key: string, expected: boolean) {
  if (Object.prototype.hasOwnProperty.call(value, key) !== expected) {
    throw new Error(`${label}: expected key ${key} presence ${String(expected)}`);
  }
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

  assertEqual("identity enabled defaults to phone register", defaultRegisterContactMode(true), "phone");
  assertEqual("identity disabled defaults to email register", defaultRegisterContactMode(false), "email");

  const phoneRegisterPayload = buildRegisterPayload({
    identityEnabled: true,
    contactMode: "phone",
    nickname: "设计学生",
    phone: "13800138000",
    email: "student@example.com",
    password: "password123"
  });
  assertHasKey("phone register payload has phone", phoneRegisterPayload, "phone", true);
  assertHasKey("phone register payload omits email", phoneRegisterPayload, "email", false);

  const emailRegisterPayload = buildRegisterPayload({
    identityEnabled: true,
    contactMode: "email",
    nickname: "设计学生",
    phone: "13800138000",
    email: "student@example.com",
    password: "password123"
  });
  assertHasKey("email register payload has email", emailRegisterPayload, "email", true);
  assertHasKey("email register payload omits phone", emailRegisterPayload, "phone", false);

  const legacyRegisterPayload = buildRegisterPayload({
    identityEnabled: false,
    contactMode: "phone",
    nickname: "旧用户",
    phone: "13800138000",
    email: "legacy@example.com",
    password: "password123"
  });
  assertHasKey("legacy register keeps email", legacyRegisterPayload, "email", true);
  assertHasKey("legacy register omits phone", legacyRegisterPayload, "phone", false);

  const identityLoginPayload = buildLoginPayload({ identityEnabled: true, identifier: "13800138000", email: "ignored@example.com", password: "password123" });
  assertHasKey("identity login uses identifier", identityLoginPayload, "identifier", true);
  assertHasKey("identity login omits email", identityLoginPayload, "email", false);

  const legacyLoginPayload = buildLoginPayload({ identityEnabled: false, identifier: "", email: "legacy@example.com", password: "password123" });
  assertHasKey("legacy login uses email", legacyLoginPayload, "email", true);
  assertHasKey("legacy login omits identifier", legacyLoginPayload, "identifier", false);

  const registerRoute = readFileSync("src/app/api/auth/register/route.ts", "utf8");
  const loginRoute = readFileSync("src/app/api/auth/login/route.ts", "utf8");
  const registerResponseSource = registerRoute.slice(registerRoute.indexOf("return NextResponse.json"));
  assertEqual("register rejects empty email and phone", registerRoute.includes("!email && !phoneResult.normalized"), true);
  assertEqual("register rejects email and phone together", registerRoute.includes("hasEmailInput && hasPhoneInput"), true);
  assertEqual("register response does not include phone", /phone:\s*user\.phone/.test(registerResponseSource), false);
  assertEqual("register response does not include passwordHash", /passwordHash\s*:/.test(registerResponseSource), false);
  assertEqual("login supports identifier", loginRoute.includes("identifier"), true);
  assertEqual("login has unified account error", loginRoute.includes("账号或密码错误。"), true);
}

try {
  main();
} catch (error) {
  console.error("Identity V2.0B.3.4 tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
