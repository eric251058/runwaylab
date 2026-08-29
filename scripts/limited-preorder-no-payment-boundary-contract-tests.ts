import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lifecycleActions = readFileSync("src/lib/projects/preorder-lifecycle-actions.ts", "utf8");
const preorderService = readFileSync("src/lib/projects/preorder-service.ts", "utf8");
const buyerOrder = readFileSync("src/app/me/orders/[id]/page.tsx", "utf8");
const buyerPanel = readFileSync("src/components/projects/LimitedPreorderPanel.tsx", "utf8");
const collaborationActions = readFileSync("src/lib/commercial-collaboration-actions.ts", "utf8");
const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
const lifecycle = readFileSync("src/lib/projects/preorder-lifecycle.ts", "utf8");

function exportedAction(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const remainder = source.slice(start + 1);
  const next = remainder.search(/\nexport async function /);
  return next >= 0 ? source.slice(start, start + 1 + next) : source.slice(start);
}

const configure = exportedAction(lifecycleActions, "configureLimitedPreorderCampaign");
const legacyOrder = exportedAction(collaborationActions, "saveProjectOrder");
const genericOrderUpdate = exportedAction(projectActions, "updateProjectOrder");

// CONFIRMED_ORDER is a strict no-collection pilot. A stray bank-transfer note
// must fail configuration rather than becoming an undisclosed money workflow.
assert.match(configure, /LimitedPreorderQualificationMode\.CONFIRMED_ORDER/);
assert.match(configure, /preorderPaymentInstructions/);
assert.match(configure, /(?:不收款|不得配置转账|不得填写付款|付款指引|支付指引)/);
assert.match(configure, /preorderPaymentInstructions:\s*preorderQualificationMode === LimitedPreorderQualificationMode\.PAID_ORDER \? preorderPaymentInstructions : null/);
assert.match(configure, /LimitedPreorderQualificationMode\.PAID_ORDER/);
assert.match(configure, /assertOnlinePaymentInstructions/);
assert.match(lifecycle, /LIMITED_PREORDER_NO_PAYMENT_NOTICE/);
assert.match(lifecycle, /不在线收款、不收定金，也不提供线下转账指引/);
assert.match(lifecycle, /assertNoLimitedPreorderPaymentSolicitation/);
assert.match(lifecycle, /normalizeLimitedPreorderNoPaymentTerms/);
assert.match(preorderService, /campaign\.preorderTermsText\.includes\(LIMITED_PREORDER_NO_PAYMENT_NOTICE\)/);
assert.match(preorderService, /assertNoLimitedPreorderPaymentSolicitation\(campaign\.preorderTermsText/);

// Order snapshots cannot silently carry payment instructions in no-money mode.
assert.match(preorderService, /paymentInstructionsSnapshot:/);
assert.match(preorderService, /LimitedPreorderQualificationMode\.PAID_ORDER/);
assert.match(
  preorderService,
  /paymentInstructionsSnapshot:\s*campaign\.preorderQualificationMode === LimitedPreorderQualificationMode\.PAID_ORDER[\s\S]*\?\s*campaign\.preorderPaymentInstructions[\s\S]*:\s*null/
);
assert.match(preorderService, /CONFIRMED_ORDER_RESERVATION_TTL_MS = 24 \* 60 \* 60 \* 1000/);
assert.match(preorderService, /PAID_ORDER_RESERVATION_TTL_MS = 20 \* 60 \* 1000/);
assert.match(preorderService, /campaign\.preorderQualificationMode === LimitedPreorderQualificationMode\.PAID_ORDER[\s\S]*PAID_ORDER_RESERVATION_TTL_MS[\s\S]*CONFIRMED_ORDER_RESERVATION_TTL_MS/);

// Payment guidance remains available only to a future PAID_ORDER surface; it is
// not rendered merely because a stale snapshot happens to be non-empty.
assert.match(buyerPanel, /campaign\.qualificationMode === "PAID_ORDER"/);
assert.match(buyerPanel, /campaign\.paymentInstructions/);
assert.match(buyerPanel, /本期不在线收款、不收定金，也不提供线下转账指引/);
assert.match(buyerPanel, /平台须在此之前完成真实意向核验，逾期会释放名额/);
assert.match(
  buyerOrder,
  /preorderQualificationMode === (?:LimitedPreorderQualificationMode\.PAID_ORDER|"PAID_ORDER")[\s\S]*order\.paymentInstructionsSnapshot|order\.paymentInstructionsSnapshot[\s\S]*preorderQualificationMode === (?:LimitedPreorderQualificationMode\.PAID_ORDER|"PAID_ORDER")/
);

// The legacy project-intent action must classify the project before both create
// and update. A managed V2.3 project cannot accumulate unlinked sidecar orders.
assert.match(legacyOrder, /isManagedLimitedPreorder/);
assert.match(legacyOrder, /presaleCampaign/);
assert.match(legacyOrder, /preorderCampaignId/);
assert.match(legacyOrder, /(?:旧项目意向|通用项目意向|sidecar|旁路)/);
const createIndex = legacyOrder.indexOf("projectOrder.create");
const managedGuardIndex = legacyOrder.indexOf("isManagedLimitedPreorder");
assert(managedGuardIndex >= 0 && managedGuardIndex < createIndex, "managed-project guard must run before legacy sidecar create");
assert.match(legacyOrder, /tx\.projectOrder|runPreorderPreparationTransaction|prisma\.\$transaction/);

// Existing sidecars are equally blocked from mutation after their project is
// managed by V2.3; checking only preorderCampaignId is insufficient.
assert.match(legacyOrder, /existing\.preorderCampaignId/);
assert.match(legacyOrder, /existing\.projectId/);
assert.match(legacyOrder, /existing[\s\S]*presaleCampaign|project[\s\S]*presaleCampaign/);

// Configuration itself refuses to cross the boundary when historical unlinked
// sidecars already exist, so later lifecycle settlement has one order universe.
assert.match(configure, /projectOrder\.(?:count|findFirst|findMany)/);
assert.match(configure, /preorderCampaignId:\s*null/);
assert.match(configure, /(?:旧版项目意向|旧项目意向|未关联预售活动|旁路订单|sidecar)/);

// Defensive isolation also applies to the generic order updater: an unlinked
// order cannot be mutated once its project has become a managed V2.3 project.
assert.match(genericOrderUpdate, /project:\s*\{/);
assert.match(genericOrderUpdate, /presaleCampaign/);
assert.match(genericOrderUpdate, /!order\.preorderCampaignId|order\.preorderCampaignId === null/);
assert.match(genericOrderUpdate, /(?:旧项目意向|通用项目意向|sidecar|旁路)/);
assert.match(genericOrderUpdate, /assertNoLimitedPreorderPaymentSolicitation\(note, "用户可见订单说明"\)/);
assert.match(genericOrderUpdate, /assertNoLimitedPreorderPaymentSolicitation\(effectiveStatusReason, "用户可见取消说明"\)/);
assert.match(genericOrderUpdate, /assertNoLimitedPreorderPaymentSolicitation\(trackingCompany, "用户可见物流公司"\)/);
assert.match(genericOrderUpdate, /assertNoLimitedPreorderPaymentSolicitation\(trackingNumber, "用户可见物流单号"\)/);
assert.match(genericOrderUpdate, /活动与订单尚未真实进入发货阶段/);

console.log("limited preorder no-payment boundary contract tests: PASS");
