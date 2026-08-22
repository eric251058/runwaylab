import assert from "node:assert/strict";
import { evaluateProviderPilotReadiness, type ProviderPilotReadinessInput } from "../src/lib/provider-pilot-readiness";

const now = new Date("2026-08-22T12:00:00.000Z");
const readyInput: ProviderPilotReadinessInput = {
  status: "ACTIVE",
  isVerified: true,
  hasOwner: true,
  name: "真实小单工坊",
  tagline: "支持新锐品牌小单快反",
  description: "专注女装样衣与五十件起的小单生产，能够提供面料建议、版型沟通、进度反馈与明确的交付周期。",
  contactChannelCount: 2,
  capabilityCount: 4,
  hasMinimumOrder: true,
  hasLeadTime: true,
  publishedProductCount: 2,
  activeSubscription: false,
  pendingInquiryCreatedAt: [],
  now
};

const ready = evaluateProviderPilotReadiness(readyInput);
assert.equal(ready.ready, true);
assert.equal(ready.passedChecks, ready.totalChecks);
assert.equal(ready.commercialPlanReady, false, "subscription must not block founding pilot");
assert.equal(ready.issues.length, 0);

const incomplete = evaluateProviderPilotReadiness({
  ...readyInput,
  status: "PENDING",
  isVerified: false,
  hasOwner: false,
  tagline: null,
  description: "太短",
  contactChannelCount: 0,
  capabilityCount: 0,
  hasMinimumOrder: false,
  hasLeadTime: false,
  publishedProductCount: 0
});
assert.equal(incomplete.ready, false);
assert.deepEqual(
  incomplete.issues.filter((issue) => issue.severity === "BLOCKER").map((issue) => issue.code),
  ["STATUS", "VERIFICATION", "OWNER", "PROFILE", "CONTACT", "CAPABILITY", "CAPACITY", "CONTENT"]
);

const staleInquiry = evaluateProviderPilotReadiness({
  ...readyInput,
  pendingInquiryCreatedAt: [new Date("2026-08-18T10:00:00.000Z")]
});
assert.equal(staleInquiry.ready, true, "operational warning must not silently disable a provider");
assert.equal(staleInquiry.issues[0]?.code, "STALE_INQUIRY");
assert.equal(staleInquiry.issues[0]?.severity, "WARNING");

console.log("provider pilot readiness tests: PASS");
