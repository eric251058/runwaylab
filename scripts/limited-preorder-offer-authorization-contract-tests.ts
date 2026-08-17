import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const offerSource = readFileSync("src/lib/projects/preorder-offer.ts", "utf8");
const authorizationActions = readFileSync("src/lib/projects/actions.ts", "utf8");
const lifecycle = readFileSync("src/lib/projects/preorder-lifecycle.ts", "utf8");
const lifecycleActions = readFileSync("src/lib/projects/preorder-lifecycle-actions.ts", "utf8");
const collaborationActions = readFileSync("src/lib/commercial-collaboration-actions.ts", "utf8");
const presaleCampaignActions = readFileSync("src/lib/presale-campaign-actions.ts", "utf8");
const authorizationsPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");
const workRoute = readFileSync("src/app/api/works/[id]/route.ts", "utf8");

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0, `missing section start: ${startMarker}`);
  assert(end > start, `missing section end: ${endMarker}`);
  return source.slice(start, end);
}

const authorizationModel = section(schema, "model ProjectDesignAuthorization {", "model ProjectMilestone {");
assert.match(authorizationModel, /offerHash\s+String\?/);
assert.match(authorizationModel, /offerSnapshot\s+Json\?/);

// The envelope is deterministic, only includes saleable products/SKUs and exposes a defensive reader.
assert.match(offerSource, /export function createLimitedPreorderOfferEnvelope/);
assert.match(offerSource, /createHash\("sha256"\)/);
assert.match(offerSource, /\.sort\(\(left, right\) => left\.id\.localeCompare\(right\.id\)\)/);
for (const status of ["APPROVED", "PREORDER_OPEN", "PAUSED", "SOLD_OUT"]) {
  assert.match(offerSource, new RegExp(`ProjectProductStatus\\.${status}`));
}
assert.match(offerSource, /\.filter\(\(sku\) => sku\.enabled\)/);
for (const issueCode of [
  "OFFER_PRODUCT_MATERIAL",
  "OFFER_PRODUCT_CARE",
  "OFFER_PRODUCT_IMAGE",
  "OFFER_SKU_REQUIRED",
  "OFFER_DISPLAY_IMAGE_SOURCE",
  "OFFER_PAYMENT_SOLICITATION"
]) {
  assert.match(offerSource, new RegExp(`issue\\("${issueCode}"`));
}
assert.match(offerSource, /export function readLimitedPreorderOfferSnapshot/);
for (const frozenField of [
  "projectTargetQuantity",
  "projectEstimatedBudget",
  "workTitle",
  "workDescription",
  "campaignTitle",
  "campaignDescription",
  "campaignEstimatedPrice",
  "campaignPriceNote",
  "campaignSizeOptions",
  "campaignColorOptions"
]) {
  assert.match(offerSource, new RegExp(frozenField), `offer must freeze ${frozenField}`);
}
assert.match(offerSource, /Preserve the reviewed WorkImage sort order/);
assert.match(offerSource, /const offerDisplayImageUrls = \[\.\.\.new Set\(displayImageUrls[\s\S]*?\)\];/);

const request = section(
  authorizationActions,
  "export async function requestProjectDesignAuthorization",
  "export async function respondProjectDesignAuthorization"
);
const respond = section(
  authorizationActions,
  "export async function respondProjectDesignAuthorization",
  "export async function revokeProjectDesignAuthorization"
);

// Request freezes the exact offer inside the same serializable transaction as the invitation.
const requestTransaction = request.indexOf("runProjectAuthorizationTransaction(async (tx) =>");
const requestEnvelope = request.indexOf("createLimitedPreorderOfferEnvelope");
const requestWrite = request.indexOf("tx.projectDesignAuthorization");
assert(requestTransaction >= 0 && requestEnvelope > requestTransaction, "offer must be read and hashed inside the authorization transaction");
assert(requestWrite > requestTransaction, "authorization must be written inside the transaction");
assert.match(request, /offer\?\.issues\.length/);
assert.match(request, /ProjectProductStatus\.DRAFT[\s\S]*ProjectProductStatus\.APPROVED/);
assert.match(request, /offerHash:\s*offer\?\.hash\s*\?\?\s*null/);
assert.match(request, /offerSnapshot:\s*offer\s*\?\s*offer\.snapshot/);
assert.match(request, /existingAuthorization\.offerHash\s*!==\s*\(offer\?\.hash\s*\?\?\s*null\)/);
assert.match(request, /action:\s*"PROJECT_DESIGN_AUTHORIZATION_REQUEST"[\s\S]*offerHash:/);

// Accept re-reads all current commercial terms and refuses a stale or now-invalid envelope.
const respondTransaction = respond.indexOf("runProjectAuthorizationTransaction(async (tx) =>");
const respondEnvelope = respond.indexOf("createLimitedPreorderOfferEnvelope");
assert(respondTransaction >= 0 && respondEnvelope > respondTransaction, "accept must recompute the offer inside the authorization transaction");
assert.match(respond, /authorization\.offerHash\s*===\s*\(currentOffer\?\.hash\s*\?\?\s*null\)/);
assert.match(respond, /currentOffer\.issues\.length\s*===\s*0/);
assert.match(respond, /status === ProjectDesignAuthorizationStatus\.ACCEPTED && !standardInvitationValid/);
assert.match(respond, /action:\s*"PROJECT_DESIGN_AUTHORIZATION_RESPONSE"[\s\S]*offerHash:/);

// Admission and production both require the accepted invitation hash to equal the live offer hash.
assert.match(lifecycle, /authorizationOfferHash:\s*string \| null/);
assert.match(lifecycle, /currentOfferHash:\s*string \| null/);
assert.match(lifecycle, /Boolean\(input\.authorizationOfferHash\)/);
assert.match(lifecycle, /input\.authorizationOfferHash\s*===\s*input\.currentOfferHash/);
assert.match(lifecycleActions, /authorizationOfferHash:\s*verifiedAuthorizationOfferHash\(authorization\)/);
assert.match(lifecycleActions, /currentOfferHash:\s*offer\.hash/);

const production = section(
  lifecycleActions,
  "export async function startLimitedPreorderProduction",
  "export async function closeLimitedPreorderCampaign"
);
assert.match(lifecycleActions, /function currentOfferForContext\([\s\S]*?createLimitedPreorderOfferEnvelope\(/);
const productionEnvelope = production.indexOf("currentOfferForContext(context, now)");
const productionAuthorization = production.indexOf("hasCurrentLimitedPreorderAuthorization");
assert(productionEnvelope >= 0 && productionEnvelope < productionAuthorization, "production must recompute the live offer before checking authorization");
assert.match(production, /authorizationOfferHash:\s*verifiedAuthorizationOfferHash\(authorization\)/);
assert.match(production, /currentOfferHash:\s*currentOffer\.hash/);

// Once sent or accepted, every direct commercial mutation path shares one hard lock.
assert.match(offerSource, /export function assertLimitedPreorderOfferEditable/);
assert.match(offerSource, /ProjectDesignAuthorizationStatus\.PENDING/);
assert.match(offerSource, /ProjectDesignAuthorizationStatus\.ACCEPTED/);
const configure = section(
  lifecycleActions,
  "export async function configureLimitedPreorderCampaign",
  "export async function prepareLimitedPreorderProjectForOpening"
);
const productSave = section(
  collaborationActions,
  "export async function saveProjectProduct",
  "export async function saveProjectSku"
);
const skuSave = section(
  collaborationActions,
  "export async function saveProjectSku",
  "export async function saveProjectOrder"
);
const projectSave = section(
  collaborationActions,
  "export async function saveCollaborationProject",
  "function integerValue"
);
const campaignSave = section(
  presaleCampaignActions,
  "export async function savePresaleCampaign",
  "export async function updatePresaleCampaignIntentStatus"
);
for (const [name, action] of [["configure", configure], ["product", productSave], ["SKU", skuSave], ["project", projectSave], ["campaign", campaignSave]] as const) {
  const transaction = action.indexOf("Transaction(async (tx) =>");
  const guard = action.indexOf("assertLimitedPreorderOfferEditable");
  if (name === "project") {
    assert(guard >= 0, "project-visible offer fields must be locked after invitation");
  } else {
    assert(transaction >= 0 && guard > transaction, `${name} offer edit lock must run against transaction-fresh authorization state`);
  }
}
assert.match(projectSave, /designAuthorizations:\s*\{[\s\S]*none:/);
assert.match(campaignSave, /designAuthorizations:\s*\{[\s\S]*none:/);
assert.match(workRoute, /function workOfferIsLocked/);
assert.match(workRoute, /Prisma\.TransactionIsolationLevel\.Serializable/);
assert.match(workRoute, /LIMITED_PREORDER_WORK_OFFER_LOCKED/);

// The author must decide from the immutable snapshot, not from mutable live product rows.
assert.match(authorizationsPage, /readLimitedPreorderOfferSnapshot/);
assert.match(authorizationsPage, /authorization\.offerSnapshot/);
for (const disclosure of [
  "materialDescription",
  "careInstructions",
  "imageStage",
  "estimatedShipDate",
  "preorderLimit"
]) {
  assert.match(authorizationsPage, new RegExp(disclosure), `author view must disclose ${disclosure} from the frozen offer`);
}
assert.match(authorizationsPage, /product\.skus/);
assert.match(authorizationsPage, /sku\.size/);
assert.match(authorizationsPage, /sku\.color/);
assert.match(authorizationsPage, /sku\.capacity/);
assert.match(authorizationsPage, /displayImageUrls/);
assert.match(authorizationsPage, /snapshot\.projectTitle/);
assert.match(authorizationsPage, /snapshot\.projectDescription/);
assert.match(authorizationsPage, /snapshot\.workTitle/);
assert.match(authorizationsPage, /snapshot\.campaignTitle/);
assert.match(authorizationsPage, /authorization\.offerHash === \(currentOffer\?\.hash \?\? null\)/);
assert.match(authorizationsPage, /authorization\.offerHash === currentOffer\.hash/);

// The real project owner sees and confirms the exact same envelope before it
// can be sent, and the server rejects a stale hash after re-reading in the tx.
assert.match(authorizationsPage, /createLimitedPreorderOfferEnvelope/);
assert.match(authorizationsPage, /name="expectedOfferHash"/);
assert.match(authorizationsPage, /name="confirmOfferEnvelope"/);
assert.match(request, /formData\.get\("expectedOfferHash"\)/);
assert.match(request, /formData\.get\("confirmOfferEnvelope"\)/);
assert.match(request, /expectedOfferHash\s*!==\s*offer\.hash/);
assert.match(request, /ownerConfirmedOfferHash/);

// The immutable snapshot itself is authenticated before author display,
// acceptance, admission, settlement, confirmation and production.
assert.match(respond, /hashLimitedPreorderOfferSnapshot\(storedOfferSnapshot\)\s*===\s*authorization\.offerHash/);
assert.match(authorizationsPage, /hashLimitedPreorderOfferSnapshot\(offerSnapshot\)\s*===\s*authorization\.offerHash/);

console.log("limited preorder offer authorization contract tests: PASS");
