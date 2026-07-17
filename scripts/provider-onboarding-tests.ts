import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quickProviderSchema, providerTypeFromServices } from "../src/lib/provider-experience";

function parseIntro(intro: string) {
  return quickProviderSchema.safeParse({
    name: "华格纺织",
    services: ["面料供应"],
    intro
  });
}

assert.equal(parseIntro("").success, true, "empty intro should pass");
assert.equal(parseIntro("好").success, true, "1 char intro should pass");
assert.equal(parseIntro("专注女装针织面料和小批量采购服务").success, true, "short intro should pass");
assert.equal(parseIntro("一".repeat(120)).success, true, "120 chars intro should pass");
assert.equal(parseIntro("一".repeat(121)).success, false, "over 120 chars intro should fail");
assert.equal(
  quickProviderSchema.safeParse({ name: "华格纺织", services: [], intro: "" }).success,
  false,
  "services should be required for normal creation"
);
assert.equal(providerTypeFromServices(["面料供应"]), "FABRIC_SUPPLIER");
assert.equal(providerTypeFromServices(["服装打样"]), "SAMPLE_STUDIO");
assert.equal(providerTypeFromServices(["小单生产"]), "FACTORY");

const formSource = readFileSync("src/app/providers/apply/SubmitProviderApplicationForm.tsx", "utf8");
const actionSource = readFileSync("src/lib/provider-market-admin.ts", "utf8");
const routeSource = readFileSync("src/app/api/provider/onboarding/route.ts", "utf8");

assert.match(formSource, /localStorage/, "provider quick creation should preserve draft");
assert.match(formSource, /进入服务商中心/, "primary action should enter provider center");
assert.match(formSource, /稍后完善/, "secondary action should allow later completion");
assert.doesNotMatch(formSource, /20-500|至少 20|minLength=\{?20/, "quick form should not require 20 chars");
assert.doesNotMatch(actionSource, /min\(20|简介至少 20/, "legacy provider action should not retain 20-char intro rule");
assert.match(routeSource, /status: ProviderStatus\.ACTIVE/, "quick creation should create a usable provider profile");
assert.match(routeSource, /publicContactEnabled: false/, "private contact should stay hidden by default");

console.log("provider onboarding tests passed");
