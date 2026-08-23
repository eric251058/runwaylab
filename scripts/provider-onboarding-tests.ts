import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quickProviderSchema, providerTypeFromServices } from "../src/lib/provider-experience";

function parseIntro(intro: string) {
  return quickProviderSchema.safeParse({
    name: "华格纺织",
    contactName: "陈经理",
    phone: "13800138000",
    city: "杭州",
    services: ["面料供应"],
    intro,
    acceptRules: true
  });
}

assert.equal(parseIntro("").success, true, "empty intro should pass");
assert.equal(parseIntro("好").success, true, "1 char intro should pass");
assert.equal(parseIntro("专注女装针织面料和小批量采购服务").success, true, "short intro should pass");
assert.equal(parseIntro("一".repeat(120)).success, true, "120 chars intro should pass");
assert.equal(parseIntro("一".repeat(121)).success, false, "over 120 chars intro should fail");
assert.equal(
  quickProviderSchema.safeParse({ name: "华格纺织", contactName: "陈经理", phone: "13800138000", city: "杭州", services: [], intro: "", acceptRules: true }).success,
  false,
  "services should be required for normal creation"
);
assert.equal(providerTypeFromServices(["面料供应"]), "FABRIC_SUPPLIER");
assert.equal(providerTypeFromServices(["服装打样"]), "SAMPLE_STUDIO");
assert.equal(providerTypeFromServices(["小单生产"]), "FACTORY");
assert.equal(
  quickProviderSchema.safeParse({ name: "其他", contactName: "陈经理", phone: "13800138000", city: "杭州", services: ["其他服务"], intro: "", acceptRules: true }).success,
  false,
  "unsupported catch-all service should not enter a workbench that only supports three provider types"
);

const formSource = readFileSync("src/app/providers/apply/SubmitProviderApplicationForm.tsx", "utf8");
const actionSource = readFileSync("src/lib/provider-market-admin.ts", "utf8");
const routeSource = readFileSync("src/app/api/provider/onboarding/route.ts", "utf8");

assert.match(formSource, /sessionStorage/, "provider application should preserve its draft only for the current browser session");
assert.match(formSource, /创建服务商工作台/, "primary action should create the private provider workspace");
assert.doesNotMatch(formSource, /自动公开/, "onboarding must not make an incomplete provider public");
assert.doesNotMatch(formSource, /20-500|至少 20|minLength=\{?20/, "quick form should not require 20 chars");
assert.doesNotMatch(actionSource, /min\(20|简介至少 20/, "legacy provider action should not retain 20-char intro rule");
assert.match(routeSource, /providerApplication\.create/, "quick onboarding should create a reviewable application");
assert.match(routeSource, /status: ProviderApplicationStatus\.PENDING/, "quick onboarding should remain auditable until self-service opening");
assert.match(routeSource, /provider\.create/, "quick onboarding should create a private provider workspace");
assert.match(routeSource, /providerDataFromApplication/, "quick onboarding must use the safe pending-provider defaults");

console.log("provider onboarding tests passed");
