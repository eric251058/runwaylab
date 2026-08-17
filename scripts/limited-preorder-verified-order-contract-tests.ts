import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
const lifecycle = readFileSync("src/lib/projects/preorder-lifecycle.ts", "utf8");
const adminOrders = readFileSync("src/app/admin/orders/page.tsx", "utf8");
const preorderService = readFileSync("src/lib/projects/preorder-service.ts", "utf8");
const orderSnapshots = readFileSync("src/lib/projects/order-snapshots.ts", "utf8");

function exportedAction(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const remainder = source.slice(start + 1);
  const next = remainder.search(/\nexport async function /);
  return next >= 0 ? source.slice(start, start + 1 + next) : source.slice(start);
}

const confirmationAction = exportedAction(actions, "confirmLimitedPreorderOrder");
const genericOrderAction = exportedAction(actions, "updateProjectOrder");

// A confirmed intent is evidence-backed state, not a free-form status label.
assert.match(schema, /enum ProjectOrderConfirmationChannel \{\s*PHONE\s*WECHAT\s*EMAIL\s*IN_PERSON\s*OTHER\s*\}/);
for (const [field, type] of [
  ["confirmedAt", "DateTime\\?"],
  ["confirmedById", "String\\?"],
  ["confirmationChannel", "ProjectOrderConfirmationChannel\\?"],
  ["confirmationEvidenceRef", "String\\?"],
  ["confirmationSummary", "String\\?"]
] as const) {
  assert.match(schema, new RegExp(`\\b${field}\\s+${type}`), `ProjectOrder is missing ${field}`);
}

// Confirmation is a dedicated admin-only, feature-gated V2.3 command.
assert.match(confirmationAction, /requireAdminUser|!user \|\| !isAdmin\(user\)/);
assert.match(confirmationAction, /isFeatureEnabled\("feature\.limited_preorder_v23"\)/);
for (const field of [
  "confirmationChannel",
  "confirmedAt",
  "confirmationEvidenceRef",
  "confirmationSummary"
]) {
  assert.match(confirmationAction, new RegExp(`formData\\.get\\("${field}"\\)`), `confirmation action must read ${field}`);
}
assert.match(confirmationAction, /Object\.values\(ProjectOrderConfirmationChannel\)/);
assert.match(confirmationAction, /confirmationEvidenceRef[\s\S]*(?:length|slice)/);
assert.match(confirmationAction, /confirmationSummary[\s\S]*(?:length|slice)/);
assert.match(confirmationAction, /assertNoLimitedPreorderPaymentSolicitation\(confirmationSummary, "用户可见核验摘要"\)/);

// The order and campaign are re-read inside a serializable retry transaction.
assert.match(confirmationAction, /runProjectOrderTransaction|prisma\.\$transaction/);
assert.match(actions, /TransactionIsolationLevel\.Serializable/);
assert.match(actions, /error\.code === "P2034"/);
assert.match(confirmationAction, /tx\.projectOrder\.findUnique/);
for (const field of ["preorderCampaignId", "preorderQualificationMode", "preorderStatus", "preorderDeadline", "reservationExpiresAt"]) {
  assert.match(confirmationAction, new RegExp(field), `confirmation action must inspect ${field}`);
}
assert.match(confirmationAction, /readLimitedPreorderOfferSnapshot/);
assert.match(confirmationAction, /hashLimitedPreorderOfferSnapshot/);
assert.match(confirmationAction, /createLimitedPreorderOfferEnvelope/);
assert.match(confirmationAction, /hasCurrentLimitedPreorderAuthorization/);
assert.match(confirmationAction, /isPublicQualityWork\(order\.project\.work\)/);
assert.match(confirmationAction, /productSnapshot: true/);
assert.match(confirmationAction, /readProjectOrderProductSnapshot\(order\.productSnapshot\)\.submissionOfferHash/);
assert.match(confirmationAction, /submissionOfferHash !== currentOffer\.hash/);
for (const field of ["reviewStatus", "contentStatus", "visibility"]) {
  assert.match(confirmationAction, new RegExp(`${field}: true`), `confirmation action must load Work.${field} inside its transaction`);
}
assert.match(confirmationAction, /关联作品已下架、不再满足公开质量门槛/);

// Only a live, unexpired, unpaid CONFIRMED_ORDER reservation may be verified.
assert.match(confirmationAction, /LimitedPreorderQualificationMode\.CONFIRMED_ORDER/);
assert.match(confirmationAction, /LimitedPreorderStatus\.OPEN/);
assert.match(confirmationAction, /LimitedPreorderStatus\.PAUSED/);
assert.match(confirmationAction, /ProjectOrderStatus\.RESERVATION/);
assert.match(confirmationAction, /ProjectOrderStatus\.PENDING_PAYMENT/);
assert.match(confirmationAction, /ProjectOrderPaymentStatus\.UNPAID/);
assert.match(confirmationAction, /preorderDeadline[\s\S]*(?:<=|<)[\s\S]*(?:now|confirmedAt)/);
assert.match(confirmationAction, /reservationExpiresAt[\s\S]*(?:<=|<)[\s\S]*(?:now|confirmedAt)/);
assert.match(confirmationAction, /confirmedAt[\s\S]*createdAt|createdAt[\s\S]*confirmedAt/);
assert.match(confirmationAction, /authorizationOfferHash:\s*verifiedAuthorizationOfferHash/);
assert.match(confirmationAction, /currentOfferHash:\s*currentOffer\.hash/);

// The state change is compare-and-set and records the complete evidence envelope.
assert.match(confirmationAction, /tx\.projectOrder\.updateMany\(/);
assert.match(confirmationAction, /updatedAt:\s*order\.updatedAt/);
assert.match(confirmationAction, /status:\s*order\.status/);
assert.match(confirmationAction, /paymentStatus:\s*(?:order\.paymentStatus|ProjectOrderPaymentStatus\.UNPAID)/);
assert.match(confirmationAction, /status:\s*ProjectOrderStatus\.CONFIRMED/);
assert.match(confirmationAction, /confirmedById:\s*(?:admin|user)\.id/);
for (const field of ["confirmedAt", "confirmationChannel", "confirmationEvidenceRef", "confirmationSummary"]) {
  assert.match(confirmationAction, new RegExp(field), `confirmation CAS must store ${field}`);
}
assert.match(confirmationAction, /reservationExpiresAt:\s*null/);
assert.match(confirmationAction, /changed\.count !== 1/);

// Audit and buyer notification are append-only consequences of a successful CAS.
const cas = confirmationAction.indexOf("projectOrder.updateMany");
const stateEvent = confirmationAction.indexOf("commerceStateEvent.create");
const adminLog = confirmationAction.indexOf("adminLog.create");
const notification = confirmationAction.indexOf("notification.create");
assert(cas >= 0, "confirmation CAS is missing");
assert(stateEvent > cas, "state event must be written after confirmation CAS");
assert(adminLog > cas, "admin log must be written after confirmation CAS");
assert(notification > cas, "buyer notification must be written after confirmation CAS");
assert.match(confirmationAction, /CommerceAggregateType\.ORDER|aggregateType:\s*"ORDER"/);
assert.match(confirmationAction, /fromState:\s*order\.status/);
assert.match(confirmationAction, /toState:\s*ProjectOrderStatus\.CONFIRMED/);
assert.match(confirmationAction, /actorId:\s*(?:admin|user)\.id/);
assert.match(confirmationAction, /(?:recipientId|userId):\s*order\.buyerId/);
assert.match(confirmationAction, /confirmationEvidenceRef/);
assert.match(confirmationAction, /confirmationSummary/);

// Generic order editing cannot manufacture the first CONFIRMED transition.
assert.match(genericOrderAction, /effectiveStatus === ProjectOrderStatus\.CONFIRMED/);
assert.match(genericOrderAction, /order\.status !== ProjectOrderStatus\.CONFIRMED/);
assert.match(genericOrderAction, /(?:专用|人工核验|核验订单)/);

// Settlement only counts CONFIRMED_ORDER rows carrying the structured evidence.
const qualifierStart = lifecycle.indexOf("export function orderQualifiesForCampaign");
const qualifierEnd = lifecycle.indexOf("export function summarizeLimitedPreorderOrders", qualifierStart);
assert(qualifierStart >= 0 && qualifierEnd > qualifierStart, "order qualifier must exist");
const qualifier = lifecycle.slice(qualifierStart, qualifierEnd);
for (const field of [
  "confirmedAt",
  "confirmedById",
  "confirmationChannel",
  "confirmationEvidenceRef",
  "confirmationSummary"
]) {
  assert.match(qualifier, new RegExp(`order\\.${field}`), `qualification must require ${field}`);
}
assert.match(qualifier, /LimitedPreorderQualificationMode\.CONFIRMED_ORDER/);
assert.match(qualifier, /expectedOfferHash: string \| null/);
assert.match(qualifier, /readProjectOrderProductSnapshot\(order\.productSnapshot\)\.submissionOfferHash/);
assert.match(qualifier, /!expectedOfferHash \|\| submissionOfferHash !== expectedOfferHash/);

// Every new order freezes the exact offer hash inside its existing JSON
// snapshot; no destructive schema migration is required.
assert.match(orderSnapshots, /submissionOfferHash: textField\(snapshot, "submissionOfferHash"\)/);
assert.match(preorderService, /productSnapshot:\s*\{[\s\S]*?submissionOfferHash: currentOffer\.hash/);

// The admin surface exposes a dedicated evidence form.
assert.match(adminOrders, /confirmLimitedPreorderOrder/);
assert.match(adminOrders, /name="confirmationChannel"/);
assert.match(adminOrders, /name="confirmedAt"/);
assert.match(adminOrders, /name="confirmationEvidenceRef"/);
assert.match(adminOrders, /name="confirmationSummary"/);

console.log("limited preorder verified order contract tests: PASS");
