import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260816213000_add_limited_preorder_lifecycle/migration.sql", "utf8");
const lifecycle = readFileSync("src/lib/projects/preorder-lifecycle.ts", "utf8");
const actions = readFileSync("src/lib/projects/preorder-lifecycle-actions.ts", "utf8");
const preorderService = readFileSync("src/lib/projects/preorder-service.ts", "utf8");
const preorderRoute = readFileSync("src/app/api/projects/[id]/preorders/route.ts", "utf8");
const presaleActions = readFileSync("src/lib/presale-campaign-actions.ts", "utf8");
const workRoute = readFileSync("src/app/api/works/[id]/route.ts", "utf8");
const adminPreorder = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
const authorizationsPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");

function occurrences(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

// The V2.3 lifecycle is additive to the existing V2.1 demand campaign.
assert.match(schema, /enum LimitedPreorderStatus \{[\s\S]*NOT_STARTED[\s\S]*OPEN[\s\S]*PAUSED[\s\S]*GOAL_REACHED[\s\S]*FAILED[\s\S]*PRODUCTION[\s\S]*CANCELLED[\s\S]*CLOSED[\s\S]*\}/);
assert.match(schema, /enum LimitedPreorderQualificationMode \{\s*CONFIRMED_ORDER\s*PAID_ORDER\s*\}/);
assert.match(schema, /model PresaleCampaign \{[\s\S]*currentCount\s+Int\s+@default\(0\)[\s\S]*preorderStatus\s+LimitedPreorderStatus\s+@default\(NOT_STARTED\)/);
assert.match(schema, /preorderTargetQuantity\s+Int\?/);
assert.match(schema, /preorderCapacity\s+Int\?/);
assert.match(schema, /preorderDeadline\s+DateTime\?/);
assert.match(schema, /preorderTermsVersion\s+String\s+@default\("limited-preorder-v1"\)/);
assert.match(schema, /preorderTermsText\s+String\?/);
assert.match(schema, /preorderPaymentInstructions\s+String\?/);
assert.match(schema, /preorderPublicNotice\s+String\?/);
assert.match(schema, /preorderOrders\s+ProjectOrder\[\]\s+@relation\("PresaleCampaignOrders"\)/);
assert.match(schema, /preorderCampaignId\s+String\?/);
assert.match(schema, /termsAcceptedAt\s+DateTime\?/);
assert.match(schema, /termsTextSnapshot\s+String\?/);
assert.match(schema, /paymentInstructionsSnapshot\s+String\?/);
assert.match(schema, /preorderCampaign\s+PresaleCampaign\?\s+@relation\("PresaleCampaignOrders"/);
assert.match(schema, /@@index\(\[preorderCampaignId, status\]\)/);
assert.match(schema, /preorderLimit\s+Int\?/);

assert.match(migration, /CREATE TYPE "LimitedPreorderStatus" AS ENUM/);
assert.match(migration, /PresaleCampaign_preorder_quantity_check/);
assert.match(migration, /"preorderTargetQuantity" <= "preorderCapacity"/);
assert.match(migration, /ProjectProduct_preorder_limit_check/);
assert.match(migration, /ProjectOrder_preorderCampaignId_fkey/);
assert.match(migration, /ON DELETE SET NULL ON UPDATE CASCADE/);
assert.doesNotMatch(migration, /currentCount/, "the V2.3 migration must not rewrite V2.1 demand counts");

// Admission has explicit project, authorization, demand, SKU, deadline, capacity and terms gates.
for (const code of [
  "PROJECT_LINK",
  "WORK_MISMATCH",
  "WORK_QUALITY",
  "PROJECT_VISIBILITY",
  "PROJECT_STATUS",
  "DESIGN_AUTHORIZATION",
  "DEMAND_TARGET",
  "DEMAND_CAMPAIGN_STATUS",
  "PREORDER_TARGET",
  "PREORDER_CAPACITY",
  "PREORDER_DEADLINE",
  "TERMS_VERSION",
  "TERMS_TEXT",
  "PAYMENT_INSTRUCTIONS",
  "SKU_REQUIRED",
  "SKU_CAPACITY",
  "SKU_PRICE",
  "SKU_LIMIT_MISMATCH",
  "CAMPAIGN_CAPACITY_UNREACHABLE"
]) {
  assert.match(lifecycle, new RegExp(`issue\\("${code}"`), `missing admission contract ${code}`);
}
assert.match(actions, /async function requireAdminUser\(\)/);
assert.match(actions, /if \(!user \|\| !isAdmin\(user\)\)/);
assert.match(actions, /isFeatureEnabled\("feature\.limited_preorder_v23"\)/);
assert.match(actions, /confirmPreorderNotice/);
assert.match(actions, /feature\.live_payment/);
assert.match(actions, /feature\.manual_payment_pilot/);
assert.match(actions, /按付款成团必须等待真实退款记录闭环完成后再启用/);
assert.match(actions, /PresaleCampaignIntentStatus\.CONFIRMED/);
assert.match(actions, /evaluateLimitedPreorderAdmission/);
assert.match(actions, /designAuthorizations:\s*\{[\s\S]*?preorderCampaignId: true,[\s\S]*?termsVersion: true,[\s\S]*?offerHash: true,[\s\S]*?offerSnapshot: true/);
assert.match(lifecycle, /input\.authorizationTermsVersion === PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION/);
assert.match(lifecycle, /input\.authorizationPreorderCampaignId === input\.campaignId/);
assert.match(lifecycle, /input\.authorizationRecordWorkId === input\.campaignWorkId/);
assert.match(lifecycle, /input\.authorizationDesignerUserId === input\.workOwnerUserId/);
assert.match(lifecycle, /input\.authorizationOwnerUserId === input\.projectOwnerUserId/);
assert.match(lifecycle, /Boolean\(input\.authorizationOfferHash\)/);
assert.match(lifecycle, /input\.authorizationOfferHash === input\.currentOfferHash/);
assert.match(actions, /hasCurrentLimitedPreorderAuthorization/);
assert.match(actions, /当前标准设计授权已失效或与项目、作品、作者、负责人不一致，不能进入生产/);

// All nine mutating lifecycle actions require a reason and use the shared serializable transaction wrapper.
assert.equal(occurrences(actions, /export async function /g), 9);
assert.equal(occurrences(actions, /const reason = assertLifecycleReason/g), 9);
assert.equal(occurrences(actions, /const publicNotice = assertPublicPreorderNotice/g), 8);
assert.equal(occurrences(actions, /await runLifecycleTransaction\(async \(tx\) =>/g), 9);
assert.match(actions, /TransactionIsolationLevel\.Serializable/);
assert.match(actions, /error\.code === "P2034"/);
assert.match(actions, /for \(let attempt = 0; attempt < 3/);

// Campaign and order writes use compare-and-set guards, then append audit events in the same transaction.
assert.match(actions, /presaleCampaign\.updateMany\(\{\s*where: \{ id: campaignId, preorderStatus: fromState \}/);
assert.match(actions, /projectOrder\.updateMany\(\{\s*where: \{ id: order\.id, status: order\.status, paymentStatus: order\.paymentStatus, fulfillmentStatus: order\.fulfillmentStatus \}/);
assert.match(actions, /if \(changed\.count !== 1\) throw new Error\(`订单 \$\{order\.id\} 状态已变化/);
assert.match(actions, /cancellationReason:\s*disposition === "CANCEL" \? publicNotice : undefined/);
assert.doesNotMatch(actions, /cancellationReason:\s*disposition === "CANCEL" \? reason : undefined/);
assert.match(actions, /applyOrderDisposition\(tx, \{[\s\S]*?reason, publicNotice, now \}\)/);
assert.match(actions, /CommerceAggregateType\.CAMPAIGN/);
assert.match(actions, /CommerceAggregateType\.ORDER/);
assert.match(actions, /tx\.commerceStateEvent\.create/);
assert.match(actions, /tx\.adminLog\.create/);
assert.match(actions, /assertNoManualReview/);
assert.match(actions, /refundPendingQuantity > 0/);
assert.match(actions, /仍有退款待处理订单，不能结束活动/);
assert(actions.indexOf("projectOrder.updateMany") < actions.indexOf("aggregateType: CommerceAggregateType.ORDER"), "order CAS must precede its audit event");

// Settlement uses actual linked orders, never the legacy demand counter, and cannot fail early.
assert.match(actions, /orders:\s*\{\s*where: \{ preorderCampaignId: campaignId \}/);
assert.match(actions, /summarizeLimitedPreorderOrders\(context\.project\.orders/);
assert.match(actions, /productSnapshot: true/);
assert.match(actions, /summarizeLimitedPreorderOrders\(context\.project\.orders, context\.campaign\.preorderQualificationMode, currentOffer\.hash\)/);
assert.match(actions, /活动尚未达标且未到截止时间，不能提前判定失败/);
assert.match(actions, /planFailedOrderDisposition/);
assert.match(actions, /planGoalReachedOrderDisposition/);
assert.match(actions, /planProductionOrderDisposition/);
assert.match(actions, /planGoalReachedOrderDisposition\(order, context\.campaign\.preorderQualificationMode, currentOffer\.hash\)/);
assert.match(actions, /planProductionOrderDisposition\(order, context\.campaign\.preorderQualificationMode, currentOffer\.hash\)/);
assert.match(lifecycle, /orderQualifiesForCampaign\(order, mode, expectedOfferHash\)/);
assert.match(lifecycle, /readProjectOrderProductSnapshot\(order\.productSnapshot\)\.submissionOfferHash/);
assert.match(adminPreorder, /summarizeLimitedPreorderOrders\(orders, campaign\.preorderQualificationMode, currentOffer\?\.hash \?\? null\)/);
assert.match(authorizationsPage, /summarizeLimitedPreorderOrders\(campaign\.preorderOrders, campaign\.preorderQualificationMode, currentOffer\?\.hash \?\? null\)/);
assert.match(actions, /关联作品已下架或不再满足公开质量门槛，不能进入生产/);
assert.match(actions, /!context\.project\.work \|\| !isPublicQualityWork\(context\.project\.work\)/);
assert.match(actions, /if \(decision === LimitedPreorderStatus\.GOAL_REACHED\) \{[\s\S]*?!context\.project\.work \|\| !isPublicQualityWork\(context\.project\.work\)[\s\S]*?不能把活动判定为成团/);
assert.match(actions, /function currentOfferForContext\([\s\S]*?createLimitedPreorderOfferEnvelope\(/);
assert.match(actions, /if \(decision === LimitedPreorderStatus\.GOAL_REACHED\) \{[\s\S]*?currentOfferForContext\(context, now\)[\s\S]*?hasCurrentLimitedPreorderAuthorization\(/);
assert.match(actions, /const productionEvidenceRef = requiredText\(formData\.get\("productionEvidenceRef"\)/);
assert.match(actions, /const productionCommitmentSummary = requiredText\(formData\.get\("productionCommitmentSummary"\)/);
assert.match(actions, /formData\.get\("confirmProductionCommitment"\) !== "on"/);
assert.match(actions, /productionCommitmentConfirmed: true/);
assert.doesNotMatch(actions, /currentCount/);
assert.doesNotMatch(
  actions,
  /status:\s*PresaleCampaignStatus\.COMPLETED/,
  "V2.3 lifecycle actions must not rewrite the independent V2.1 demand campaign status"
);

// V2.1 currentCount remains the non-cancelled demand-intent counter.
assert.match(presaleActions, /presaleCampaignIntent\.create\([\s\S]*currentCount:\s*\{\s*increment: quantity/);
assert.match(presaleActions, /const wasCounted = intent\.status !== PresaleCampaignIntentStatus\.CANCELLED/);
assert.match(presaleActions, /const willBeCounted = status !== PresaleCampaignIntentStatus\.CANCELLED/);
assert.match(presaleActions, /currentCount: willBeCounted\s*\? \{ increment: intent\.quantity \}\s*: \{ decrement: intent\.quantity \}/);
assert.match(presaleActions, /where: \{ id: intent\.campaignId, currentCount: \{ gte: intent\.quantity \} \}/);
assert.match(presaleActions, /data: \{ currentCount: \{ decrement: intent\.quantity \} \}/);
assert.doesNotMatch(preorderService, /currentCount/);

// A safety/copyright takedown fails closed across the live campaign in the
// same serializable transaction, with a durable campaign event and admin log.
assert.match(workRoute, /action === "offline"[\s\S]*runWorkLifecycleTransaction\(async \(tx\) =>/);
assert.match(workRoute, /TransactionIsolationLevel\.Serializable/);
assert.match(workRoute, /preorderStatus: LimitedPreorderStatus\.PAUSED/);
assert.match(workRoute, /status: CollaborationProjectStatus\.PREORDER_READY/);
assert.match(workRoute, /status: ProjectProductStatus\.PAUSED/);
assert.match(workRoute, /aggregateType: CommerceAggregateType\.CAMPAIGN/);
assert.match(workRoute, /fromState: LimitedPreorderStatus\.OPEN/);
assert.match(workRoute, /toState: LimitedPreorderStatus\.PAUSED/);
assert.match(workRoute, /action: "WORK_OFFLINE_PAUSE_LIMITED_PREORDER"/);

// Order creation is tied to the open campaign, locks capacity and snapshots accepted terms.
assert.match(preorderService, /campaign\.preorderStatus !== LimitedPreorderStatus\.OPEN/);
assert.match(preorderService, /isPublicQualityWork\(project\.work\)/);
assert.match(preorderService, /PAYMENT_MODE_NOT_AVAILABLE/);
assert.match(preorderService, /preorderCampaignId: campaign\.id/);
assert.match(preorderService, /CAMPAIGN_CAPACITY_EXCEEDED/);
assert.match(preorderService, /PRODUCT_CAPACITY_EXCEEDED/);
assert.match(preorderService, /paymentStatus: \{ in: \[ProjectOrderPaymentStatus\.PAID, ProjectOrderPaymentStatus\.PARTIALLY_REFUNDED\] \}/);
assert.match(preorderService, /termsVersion: campaign\.preorderTermsVersion/);
assert.match(preorderService, /termsTextSnapshot: campaign\.preorderTermsText/);
assert.match(preorderService, /termsAcceptedAt: now/);
assert.match(preorderService, /submissionOfferHash: currentOffer\.hash/);
assert.match(preorderService, /paymentStatus: ProjectOrderPaymentStatus\.UNPAID/);
assert.match(preorderRoute, /INVALID_QUANTITY/);
assert.doesNotMatch(preorderRoute, /\? number : 1/, "invalid quantities must not silently become one unit");
assert.doesNotMatch(preorderRoute, /createPaymentProvider/);

console.log("limited preorder lifecycle contract tests: PASS");
