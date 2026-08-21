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

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.match(schema, /model ProviderSubscription \{/);
assert.match(schema, /enum ProviderSubscriptionStatus \{/);
assert.match(schema, /requestedProviderSubscriptions/);

const migration = fs.readFileSync("prisma/migrations/20260821080000_add_provider_subscriptions/migration.sql", "utf8");
assert.match(migration, /CREATE TABLE "ProviderSubscription"/);
assert.match(migration, /ON DELETE CASCADE/);

const subscription = fs.readFileSync("src/lib/provider-subscription.ts", "utf8");
assert.match(subscription, /LEGACY_GRACE/);
assert.match(subscription, /productLimit: 10/);
assert.match(subscription, /aiProductExtractionEnabled: paid/);
assert.match(subscription, /endsAt: \{ gt: now \}/);

const actions = fs.readFileSync("src/lib/provider-subscription-actions.ts", "utf8");
assert.match(actions, /PROVIDER_SUBSCRIPTION_\$\{action\}/);
assert.match(actions, /已有待审核或生效中的套餐/);
assert.match(actions, /首批试运营权益每个服务商只能申请一次/);
assert.doesNotMatch(actions, /paymentStatus/);

const providerActions = fs.readFileSync("src/lib/provider-center-actions.ts", "utf8");
assert.match(providerActions, /getProviderEntitlements/);
assert.match(providerActions, /currentProductCount >= entitlements\.productLimit/);
assert.match(route, /aiProductExtractionEnabled/);

console.log("provider commercialization contract tests: PASS");

