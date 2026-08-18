import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/projects/preorder-lifecycle-actions.ts", "utf8");
const page = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
const collaborationActions = readFileSync("src/lib/commercial-collaboration-actions.ts", "utf8");
const rules = readFileSync("src/lib/projects/rules.ts", "utf8");

function exportedActionSource(name: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const next = actions.indexOf("\nexport async function ", start + 1);
  return actions.slice(start, next >= 0 ? next : actions.length);
}

function namedFunctionSource(name: string, nextName: string) {
  const start = actions.indexOf(`function ${name}`);
  const end = actions.indexOf(`function ${nextName}`, start + 1);
  assert(start >= 0, `${name} helper must exist`);
  assert(end > start, `${name} helper must end before ${nextName}`);
  return actions.slice(start, end);
}

const action = exportedActionSource("prepareLimitedPreorderProjectForOpening");
const adminLogHelper = namedFunctionSource("recordLifecycleAdminLog", "applyOrderDisposition");

// Preparation is a privileged, explicit operation and uses the same retryable
// serializable boundary as the irreversible lifecycle actions.
assert.match(action, /const admin = await requireAdminUser\(\)/);
assert.match(action, /const projectId = requiredText\(formData\.get\("projectId"\)/);
assert.match(action, /const campaignId = requiredText\(formData\.get\("campaignId"\)/);
assert.match(action, /const reason = assertLifecycleReason\(optionalText\(formData\.get\("reason"\)\)\)/);
assert.match(action, /formData\.get\("confirmProjectPreparation"\) !== "on"/);
assert.match(action, /await runLifecycleTransaction\(async \(tx\) =>/);
assert.match(actions, /prisma\.\$transaction\(operation, \{ isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable \}\)/);
assert.match(actions, /error instanceof Prisma\.PrismaClientKnownRequestError && error\.code === "P2034" && attempt < 2/);

const transaction = action.indexOf("runLifecycleTransaction(async (tx) =>");
const contextRead = action.indexOf("loadLifecycleContext(tx", transaction);
const campaignGuard = action.indexOf("LimitedPreorderStatus.NOT_STARTED", contextRead);
const qualityGate = action.indexOf("isPublicQualityWork(context.project.work)", campaignGuard);
const offerBuild = action.indexOf("createLimitedPreorderOfferEnvelope", qualityGate);
const completenessGate = action.indexOf("offer.issues.length", offerBuild);
const authorizationGate = action.indexOf("hasCurrentLimitedPreorderAuthorization", completenessGate);
const projectCas = action.indexOf("tx.collaborationProject.updateMany", contextRead);
const adminLog = action.indexOf("recordLifecycleAdminLog(tx", projectCas);

assert(transaction >= 0, "preparation must start the serializable transaction");
assert(contextRead > transaction, "project and campaign state must be re-read in the transaction");
assert(campaignGuard > contextRead, "NOT_STARTED must be checked after the transactional read");
assert(qualityGate > campaignGuard, "the public-work quality gate must run after the campaign guard");
assert(offerBuild > qualityGate, "the current offer must be built after work quality succeeds");
assert(completenessGate > offerBuild, "the complete offer must be checked before authorization");
assert(authorizationGate > completenessGate, "authorization must be checked against the complete current offer");
assert(projectCas > authorizationGate, "the project write must only happen after all preparation gates succeed");
assert(adminLog > projectCas, "the AdminLog must be appended after the guarded project write");
assert.doesNotMatch(action.slice(0, transaction), /prisma\.(collaborationProject|presaleCampaign|projectDesignAuthorization|projectProduct)\./, "preparation must not trust a stale domain read outside the transaction");

// The preparation action is only valid before the campaign starts. It evaluates
// the exact state that will exist after the guarded visibility/status change,
// including current offer authorization, complete campaign/product/SKU data and
// the real public-work quality gate.
assert.match(action, /context\.campaign\.preorderStatus !== LimitedPreorderStatus\.NOT_STARTED/);
assert.match(action, /!context\.project\.work \|\| !isPublicQualityWork\(context\.project\.work\)/);
assert.match(action, /createLimitedPreorderOfferEnvelope\(\{[\s\S]*projectId[\s\S]*campaign: context\.campaign[\s\S]*products: context\.project\.products/);
assert.match(action, /if \(offer\.issues\.length\)/);
assert.match(action, /hasCurrentLimitedPreorderAuthorization\(\{[\s\S]*authorizationRecordStatus:[\s\S]*authorizationOfferHash: verifiedAuthorizationOfferHash\(authorization\)[\s\S]*currentOfferHash: offer\.hash/);
assert.match(action, /canPrepareManagedLimitedPreorderProject\(context\.project\.status\)/);
assert.match(rules, /MANAGED_PREORDER_PREPARATION_PROJECT_STATUSES:[\s\S]*CollaborationProjectStatus\.SAMPLING[\s\S]*CollaborationProjectStatus\.PREORDER_READY/);
for (const forbiddenStage of ["PRODUCTION", "QUALITY_CHECK", "SHIPPING", "COMPLETED", "CANCELLED"]) {
  assert.doesNotMatch(
    rules.match(/MANAGED_PREORDER_PREPARATION_PROJECT_STATUSES:[\s\S]*?\];/)?.[0] ?? "",
    new RegExp(`CollaborationProjectStatus\\.${forbiddenStage}(?:,|\\s*\\])`),
    `${forbiddenStage} must never be regressed to PREORDER_READY`
  );
}
assert.match(collaborationActions, /\[CollaborationProjectStatus\.PREORDER_READY, CollaborationProjectStatus\.PREORDER_OPEN, CollaborationProjectStatus\.PRODUCTION\]/);
assert.match(collaborationActions, /专用审计/);
assert.match(collaborationActions, /canPrepareManagedLimitedPreorderProject\(existingProject\.status\)/);
assert.match(collaborationActions, /canPrepareManagedLimitedPreorderProject\(data\.status\)/);

// Visibility and readiness move together under a compare-and-set guard. The
// audit record is in the same transaction and identifies the before/after state,
// actor, campaign, current offer and human reason.
assert.match(action, /tx\.collaborationProject\.updateMany\(\{[\s\S]*where:\s*\{[\s\S]*id:\s*projectId[\s\S]*updatedAt:\s*context\.project\.updatedAt[\s\S]*status:\s*context\.project\.status[\s\S]*visibility:\s*context\.project\.visibility[\s\S]*designerAuthorizationStatus:\s*ProjectDesignAuthorizationStatus\.ACCEPTED[\s\S]*\}[\s\S]*data:\s*\{[\s\S]*status:\s*CollaborationProjectStatus\.PREORDER_READY[\s\S]*visibility:\s*CollaborationProjectVisibility\.PUBLIC[\s\S]*\}/);
assert.match(action, /if \(changed\.count !== 1\)/);
assert.match(adminLogHelper, /await tx\.adminLog\.create/);
assert.match(action, /action: "LIMITED_PREORDER_PROJECT_PREPARE_FOR_OPENING"/);
assert.match(action, /adminId: admin\.id/);
assert.match(action, /reason/);
assert.match(action, /oldStatus: context\.project\.status/);
assert.match(action, /newStatus: CollaborationProjectStatus\.PREORDER_READY/);
assert.match(action, /oldVisibility: context\.project\.visibility/);
assert.match(action, /newVisibility: CollaborationProjectVisibility\.PUBLIC/);
assert.match(action, /campaignId/);
assert.match(action, /offerHash/);

// "Prepare" is intentionally not "open": no campaign/product lifecycle write,
// no order mutation, no feature-flag mutation and no commerce transition event.
assert.doesNotMatch(action, /preorderStatus:\s*LimitedPreorderStatus\.OPEN/);
assert.doesNotMatch(action, /status:\s*CollaborationProjectStatus\.PREORDER_OPEN/);
assert.doesNotMatch(action, /status:\s*ProjectProductStatus\.PREORDER_OPEN/);
assert.doesNotMatch(action, /tx\.presaleCampaign\.(create|createMany|update|updateMany|upsert|delete|deleteMany)/);
assert.doesNotMatch(action, /tx\.projectProduct\.(create|createMany|update|updateMany|upsert|delete|deleteMany)/);
assert.doesNotMatch(action, /tx\.projectOrder\.(create|createMany|update|updateMany|upsert|delete|deleteMany)/);
assert.doesNotMatch(action, /tx\.commerceStateEvent\.create/);
assert.doesNotMatch(action, /systemSetting|FEATURE_FLAG_UPDATE|updateFeatureFlag/);

// The admin workbench makes the human decision explicit. It asks for a reason
// and an affirmative confirmation while explaining the limited effect.
assert.match(page, /prepareLimitedPreorderProjectForOpening/);
assert.match(page, /campaign\.preorderStatus === LimitedPreorderStatus\.NOT_STARTED/);
assert.match(page, /name="reason"/);
assert.match(page, /minLength=\{4\}/);
assert.match(page, /name="confirmProjectPreparation"/);
assert.match(page, /type="checkbox"/);
assert.match(page, /required/);
assert.match(page, /不会(?:自动)?(?:开放|开启)预售/);
assert.match(page, /不会(?:自动)?创建订单/);

console.log("limited preorder project opening preparation contract tests: PASS");
