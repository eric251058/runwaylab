import fs from "node:fs";
import assert from "node:assert/strict";
import { ProviderSubscriptionPlan, ProviderSubscriptionStatus } from "@prisma/client";
import {
  providerFoundingTrialAiExtractionMonthlyLimit,
  providerSubscriptionPeriod
} from "../src/lib/provider-subscription";

const startsAt = new Date("2026-08-23T00:00:00.000Z");
const period = providerSubscriptionPeriod(ProviderSubscriptionPlan.FOUNDING_TRIAL, startsAt);
assert.equal(period.startsAt.toISOString(), startsAt.toISOString());
assert.equal(period.endsAt.toISOString(), "2026-11-21T00:00:00.000Z");
assert.equal(period.trialEndsAt?.toISOString(), period.endsAt.toISOString());
assert.equal(providerFoundingTrialAiExtractionMonthlyLimit(), 10);

const actions = fs.readFileSync("src/lib/provider-subscription-actions.ts", "utf8");
assert.match(actions, /plan === ProviderSubscriptionPlan\.FOUNDING_TRIAL/);
assert.match(actions, /status: ProviderSubscriptionStatus\.ACTIVE/);
assert.match(actions, /reviewedAt: now/);
assert.match(actions, /providerSubscriptionPeriod\(plan, now\)/);
assert.match(actions, /服务商自助开通首批试运营权益/);
assert.match(actions, /ProviderSubscriptionStatus\.PENDING/);
assert.match(actions, /已有待审核或生效中的套餐/);
assert.doesNotMatch(actions, /paymentStatus/);

const page = fs.readFileSync("src/app/provider-center/membership/page.tsx", "utf8");
assert.match(page, /立即开通 90 天试运营/);
assert.match(page, /付费套餐在未接在线支付前仍由平台核对后生效/);
assert.match(page, /90 天首批试运营权益已开通/);

const membership = fs.readFileSync("src/lib/provider-membership.ts", "utf8");
assert.match(membership, /AI 图片资料提取每月 10 次/);

assert.equal(ProviderSubscriptionStatus.ACTIVE, "ACTIVE");
console.log("provider founding trial self-service tests: PASS");
