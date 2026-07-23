import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accountDisplayName, maskEmail, maskPhone, safeAccountLabel } from "../src/lib/account-display";

const authNav = readFileSync("src/components/layout/AuthNav.tsx", "utf8");
const meRoute = readFileSync("src/app/api/auth/me/route.ts", "utf8");
const meRouteResponse = meRoute.slice(meRoute.indexOf("return NextResponse.json({\n    user"));

assert.equal(safeAccountLabel("林同学"), "林同学");
assert.equal(maskPhone("13800138000"), "+86 138****8000");
assert.equal(safeAccountLabel("13800138000"), "+86 138****8000");
assert.equal(maskEmail("student@example.com"), "st***@example.com");
assert.equal(safeAccountLabel("student@example.com"), "st***@example.com");
assert.equal(
  accountDisplayName({ providerName: "绍兴众蔚纺织品有限公司", nickname: "13800138000", email: "owner@example.com", preferProvider: true }),
  "绍兴众蔚纺织品有限公司"
);
assert.equal(accountDisplayName({ nickname: "13800138000" }), "+86 138****8000");
assert.equal(accountDisplayName({ nickname: "owner@example.com" }), "ow***@example.com");
assert.equal(accountDisplayName({}), "账号");

assert.match(authNav, /displayName/, "AuthNav should use a safe display name");
assert.match(authNav, /providerName/, "AuthNav should support provider names");
assert.match(authNav, /maskedAccount/, "AuthNav should use masked account fallback");
assert.match(authNav, /退出中…/, "logout loading copy should be visible");
assert.match(authNav, /logoutError/, "logout errors should be shown without pretending success");
assert.match(authNav, /disabled=\{loggingOut\}/, "logout button should block duplicate clicks while pending");
assert.doesNotMatch(authNav, /text-ink\/50/, "logout normal state must not look disabled");
assert.doesNotMatch(authNav, /alert\(/, "logout should not use native alerts for normal feedback");

assert.match(meRoute, /providerName/, "me route should return provider name for provider accounts");
assert.match(meRoute, /accountDisplayName/, "me route should build safe account display names server-side");
assert.doesNotMatch(meRouteResponse, /\n\s+phone:\s*user\.phone/, "me route must not return full phone in response");

console.log("auth nav account menu tests passed");
