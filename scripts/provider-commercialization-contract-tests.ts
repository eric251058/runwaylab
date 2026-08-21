import fs from "node:fs";
import assert from "node:assert/strict";
import { PROVIDER_MEMBERSHIP_PLANS, providerPlanById } from "../src/lib/provider-membership";

assert.equal(PROVIDER_MEMBERSHIP_PLANS.length, 4);
assert.equal(providerPlanById("GROWTH_MONTHLY")?.priceCny, 299);
assert.equal(providerPlanById("GROWTH_QUARTERLY")?.priceCny, 799);
assert.equal(providerPlanById("GROWTH_YEARLY")?.priceCny, 2399);
assert.equal(PROVIDER_MEMBERSHIP_PLANS.filter((plan) => plan.recommended).length, 1);
assert.ok(PROVIDER_MEMBERSHIP_PLANS.every((plan) => plan.limits.length > 0));

const route = fs.readFileSync("src/app/api/provider/fabrics/extract/route.ts", "utf8");
assert.match(route, /AI_PRODUCT_EXTRACTION_ENABLED/);
assert.match(route, /getCurrentUser/);
assert.match(route, /ProviderStatus\.ACTIVE/);
assert.match(route, /ProviderType\.FABRIC_SUPPLIER/);
assert.match(route, /store:\s*false/);
assert.match(route, /禁止猜测/);
assert.match(route, /additionalProperties:\s*false/);

const form = fs.readFileSync("src/components/provider-center/ProviderFabricForm.tsx", "utf8");
assert.match(form, /仅填充空白字段/);
assert.match(form, /不会自动保存或发布/);
assert.match(form, /if \(control\.value\.trim\(\)\) continue/);

console.log("provider commercialization contract tests: PASS");

