import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync("src/app/providers/join/QuickProviderOnboardingForm.tsx", "utf8");
const page = readFileSync("src/app/providers/join/page.tsx", "utf8");
const route = readFileSync("src/app/api/provider/onboarding/route.ts", "utf8");

function mustInclude(source: string, value: string, message: string) {
  assert.ok(source.includes(value), message);
}

mustInclude(form, 'fetch("/api/provider/onboarding"', "quick form must call the reviewed onboarding endpoint");
mustInclude(form, 'name: ""', "company name must be collected");
mustInclude(form, 'contactName: ""', "contact name must be collected");
mustInclude(form, 'phone: ""', "phone must be collected");
mustInclude(form, 'city: ""', "city must be collected");
mustInclude(form, "services: []", "service capabilities must be collected");
mustInclude(form, "acceptRules: false", "truthfulness and use consent must be explicit");
mustInclude(form, "平台不承诺订单、排名或收益", "conversion copy must not promise commercial outcomes");
mustInclude(form, "/login?next=/providers/join", "guest submission must offer a safe return path");
mustInclude(page, "<QuickProviderOnboardingForm />", "public join page must expose quick onboarding");
mustInclude(page, 'href="#quick-apply"', "primary CTA must lead to the quick form");
mustInclude(page, 'href="/providers/apply"', "full application must remain available");
mustInclude(route, "ProviderApplicationStatus.PENDING", "quick applications must remain pending for review");
mustInclude(route, 'submissionChannel: "QUICK_ONBOARDING"', "quick submissions must remain auditable");
mustInclude(route, "if (existingProvider)", "duplicate provider creation must be blocked");

console.log("provider progressive onboarding tests: PASS");
