import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/projects/preorder-service.ts", "utf8");
const helper = readFileSync("src/lib/projects/preorder-buyer-cap.ts", "utf8");
const profileRoute = readFileSync("src/app/api/me/profile/route.ts", "utf8");
const route = readFileSync("src/app/api/projects/[id]/preorders/route.ts", "utf8");
const panel = readFileSync("src/components/projects/LimitedPreorderPanel.tsx", "utf8");
const publicPage = readFileSync("src/app/projects/[id]/page.tsx", "utf8");

assert.match(helper, /PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT\s*=\s*2/);
assert.match(helper, /emailVerifiedAt/);
assert.match(helper, /phoneVerifiedAt/);
assert.match(helper, /account\.email\?\.trim\(\)[\s\S]*account\.emailVerifiedAt/);
assert.match(helper, /account\.phone\?\.trim\(\)[\s\S]*account\.phoneVerifiedAt/);

// Same-account submissions are serialized in the same transaction as every
// product, SKU and campaign capacity aggregate.
assert.match(service, /FROM "User"[\s\S]*FOR UPDATE/);
assert.match(service, /TransactionIsolationLevel\.Serializable/);
assert.match(service, /const activeReservationWhere =/);
assert.match(service, /reservationExpiresAt:\s*\{ gt: now \}/);
assert.match(service, /ProjectOrderStatus\.RESERVATION, ProjectOrderStatus\.PENDING_PAYMENT/);
assert.match(service, /status:\s*\{ notIn: \[ProjectOrderStatus\.CANCELLED, ProjectOrderStatus\.REFUNDED\] \}/);

const buyerVerificationGate = service.indexOf("if (!hasVerifiedBuyerContact(buyerAccount))");
const buyerVerificationGateEnd = service.indexOf("\n        }\n\n        const expiringStatuses", buyerVerificationGate);
const buyerAggregateStart = service.indexOf("const buyerCampaignReserved");
const buyerAggregateEnd = service.indexOf("if (exceedsPilotBuyerCampaignLimit", buyerAggregateStart);
assert(buyerVerificationGate >= 0, "a verified email or phone must be required before capacity is consumed");
assert.match(service.slice(buyerVerificationGate, buyerAggregateStart), /BUYER_CONTACT_VERIFICATION_REQUIRED/);
assert(buyerVerificationGate < buyerAggregateStart, "verification must fail closed before the buyer capacity aggregate and order creation");
assert(
  buyerVerificationGateEnd > buyerVerificationGate && buyerVerificationGateEnd < buyerAggregateStart,
  "the verification gate must close before the campaign-wide buyer cap so eligible buyers remain capped"
);
assert(buyerAggregateStart >= 0 && buyerAggregateEnd > buyerAggregateStart, "buyer campaign aggregate must exist");
const buyerAggregate = service.slice(buyerAggregateStart, buyerAggregateEnd);
assert.match(buyerAggregate, /preorderCampaignId:\s*campaign\.id/);
assert.match(buyerAggregate, /buyerId:\s*input\.user\.id/);
assert.doesNotMatch(buyerAggregate, /productId|skuId/, "buyer cap must aggregate across every product and SKU");
assert.match(buyerAggregate, /activeReservationWhere/);

// Idempotent replay returns the existing order before the buyer-cap aggregate,
// so the original reservation cannot cause its own retry to be rejected.
const existingOrderReturn = service.indexOf("if (existingOrder) return { order: existingOrder, repeated: true }");
assert(existingOrderReturn >= 0, "idempotent order replay return must exist");
assert(existingOrderReturn < buyerAggregateStart, "idempotent replay must run before buyer cap evaluation");

assert.match(service, /PILOT_BUYER_CAMPAIGN_LIMIT_EXCEEDED/);
assert.match(service, /hasVerifiedBuyerContact\(buyerAccount\)/);
assert.match(service, /input\.quantity > PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT/);
assert.match(route, /number <= PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT/);
assert.match(panel, /isLoggedIn && buyerContactVerified/);
assert.match(panel, /max=\{buyerQuantityLimit\}/);
assert.match(panel, /当前暂不提供自助验证/);
assert.match(publicPage, /hasVerifiedBuyerContact\(currentUser\)/);
assert.match(publicPage, /buyerQuantityLimit=\{PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT\}/);

// A verified phone belongs to the exact normalized number that was checked.
// Self-service profile edits must never carry the old verification timestamp
// onto a replacement number.
assert.match(profileRoute, /select:\s*\{\s*persona:\s*true,\s*email:\s*true,\s*phone:\s*true\s*\}/);
assert.match(profileRoute, /const phoneChanged = userBeforeUpdate\?\.phone !== phoneResult\.normalized/);
assert.match(
  profileRoute,
  /phone:\s*phoneResult\.normalized,\s*phoneVerifiedAt:\s*phoneChanged\s*\?\s*null\s*:\s*undefined/
);

console.log("limited preorder buyer cap contract tests: PASS");
