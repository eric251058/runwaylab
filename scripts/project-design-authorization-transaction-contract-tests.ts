import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/projects/actions.ts", "utf8");

function actionSource(name: string, nextName: string) {
  const start = source.indexOf(`export async function ${name}`);
  const end = source.indexOf(`export async function ${nextName}`, start + 1);
  assert(start >= 0, `${name} must exist`);
  assert(end > start, `${name} must end before ${nextName}`);
  return source.slice(start, end);
}

const request = actionSource("requestProjectDesignAuthorization", "respondProjectDesignAuthorization");
const respond = actionSource("respondProjectDesignAuthorization", "revokeProjectDesignAuthorization");
const revoke = actionSource("revokeProjectDesignAuthorization", "updateProjectOrder");

assert.match(source, /async function runProjectAuthorizationTransaction<T>\(operation: \(tx: Prisma\.TransactionClient\) => Promise<T>\)/);
assert.match(source, /runProjectAuthorizationTransaction<[\s\S]*for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
assert.match(source, /prisma\.\$transaction\(operation, \{ isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable \}\)/);
assert.match(source, /error instanceof Prisma\.PrismaClientKnownRequestError && error\.code === "P2034" && attempt < 2/);

for (const [name, action] of [
  ["request", request],
  ["respond", respond],
  ["revoke", revoke]
] as const) {
  const transaction = action.indexOf("runProjectAuthorizationTransaction(async (tx) =>");
  const read = action.indexOf("await tx.");
  const adminLog = action.indexOf("await tx.adminLog.create");
  const notification = action.indexOf("await createNotificationSafe");
  assert(transaction >= 0, `${name} must use the serializable authorization transaction`);
  assert(read > transaction, `${name} must re-read state inside the transaction`);
  assert(adminLog > read, `${name} AdminLog must be written inside the transaction`);
  assert(notification > adminLog, `${name} notification must be emitted only after commit`);
  assert.doesNotMatch(action.slice(0, transaction), /prisma\.(collaborationProject|projectDesignAuthorization|presaleCampaign|projectProduct)\./, `${name} must not use a stale pre-transaction domain read`);
  assert.doesNotMatch(action, /prisma\.adminLog\.create/, `${name} AdminLog must not be outside the transaction`);
}

// Request re-reads the campaign guard, uses CAS for an existing authorization and project, and logs atomically.
assert.match(request, /tx\.collaborationProject\.findUnique/);
assert.match(request, /presaleCampaign:\s*\{\s*select:\s*\{[\s\S]*?id: true,[\s\S]*?preorderStatus: true/);
assert.match(request, /preorderStatus !== LimitedPreorderStatus\.NOT_STARTED/);
assert.match(request, /restoringRevokedPausedAuthorization/);
assert.match(request, /canPrepareManagedLimitedPreorderProject\(project\.status\)/);
assert.match(request, /existingAuthorization\?\.status === ProjectDesignAuthorizationStatus\.REVOKED/);
assert.match(request, /tx\.projectDesignAuthorization\.findUnique/);
assert.match(request, /tx\.projectDesignAuthorization\.updateMany\(\{[\s\S]*updatedAt: existingAuthorization\.updatedAt/);
assert.match(request, /workId: project\.workId/);
assert.match(request, /designerUserId: project\.work\.userId/);
assert.match(request, /tx\.projectDesignAuthorization\.create/);
assert.match(request, /tx\.collaborationProject\.updateMany\(\{[\s\S]*updatedAt: project\.updatedAt[\s\S]*designerAuthorizationStatus: project\.designerAuthorizationStatus/);
assert.match(request, /data: \{ designerAuthorizationStatus: ProjectDesignAuthorizationStatus\.PENDING \}/);
assert.match(request, /if \(projectChanged\.count !== 1\)/);
assert.match(request, /action: "PROJECT_DESIGN_AUTHORIZATION_REQUEST"/);
assert.match(request, /canRequestProjectDesignAuthorization\(user, project\)/);
assert.match(request, /projectDesignAuthorizationPolicy\(project\.presaleCampaign\?\.id \?\? null\)/);
assert.match(request, /preorderCampaignId: policy\.preorderCampaignId/);
assert.match(request, /scope: policy\.scope/);
assert.match(request, /royaltyDescription: policy\.royaltyNotice/);
assert.match(request, /requestMode: "SELF_SERVICE_STANDARD"/);
assert.doesNotMatch(request, /formData\.get\("termsVersion"\)/);
assert.doesNotMatch(request, /formData\.get\("scope"\)/);
assert.doesNotMatch(request, /formData\.get\("royaltyDescription"\)/);
assert.match(request, /const pendingRequiresStandardRefresh = Boolean\([\s\S]*existingAuthorization\.termsVersion !== policy\.termsVersion[\s\S]*existingAuthorization\.preorderCampaignId !== policy\.preorderCampaignId[\s\S]*existingAuthorization\.workId !== project\.workId[\s\S]*existingAuthorization\.designerUserId !== project\.work\.userId[\s\S]*existingAuthorization\.ownerUserId !== ownerUserId[\s\S]*\);/);
assert.match(request, /existingAuthorization\?\.status === ProjectDesignAuthorizationStatus\.ACCEPTED[\s\S]*不能重新发起并覆盖该决定/);
assert.match(request, /existingAuthorization\?\.status === ProjectDesignAuthorizationStatus\.PENDING[\s\S]*&& !pendingRequiresStandardRefresh[\s\S]*标准授权邀请已经发送/);
assert.match(request, /if \(existingAuthorization\) \{[\s\S]*tx\.projectDesignAuthorization\.updateMany/);

// A non-accept response cannot race an OPEN campaign; both authorization and project are CAS writes.
assert.match(respond, /tx\.projectDesignAuthorization\.findUnique/);
assert.match(respond, /const authorizationId = requiredText\(formData\.get\("authorizationId"\)/);
assert.match(respond, /const expectedUpdatedAtText = requiredText\(formData\.get\("expectedUpdatedAt"\)/);
assert.match(respond, /where: \{ id: authorizationId \}/);
assert.match(respond, /authorization\.projectId !== projectId/);
assert.match(respond, /authorization\.updatedAt\.getTime\(\) !== expectedUpdatedAt\.getTime\(\)/);
assert.match(respond, /presaleCampaign:\s*\{\s*select:\s*\{[\s\S]*?id: true,[\s\S]*?preorderStatus: true/);
assert.match(respond, /authorization\.status !== ProjectDesignAuthorizationStatus\.PENDING[\s\S]*接受或拒绝只能针对等待决定的邀请/);
assert.match(respond, /projectDesignAuthorizationPolicy\(authorization\.project\.presaleCampaign\?\.id \?\? null\)/);
assert.match(respond, /authorization\.termsVersion === policy\.termsVersion/);
assert.match(respond, /authorization\.preorderCampaignId === policy\.preorderCampaignId/);
assert.match(respond, /authorization\.scope === policy\.scope/);
assert.match(respond, /authorization\.workId === authorization\.project\.workId/);
assert.match(respond, /authorization\.ownerUserId === currentOwnerUserId/);
assert.match(respond, /authorization\.designerUserId === authorization\.project\.work\?\.userId/);
assert.match(respond, /status === ProjectDesignAuthorizationStatus\.ACCEPTED && !standardInvitationValid/);
assert.match(respond, /where: \{\s*id: authorizationId,\s*projectId,\s*status: ProjectDesignAuthorizationStatus\.PENDING,\s*updatedAt: expectedUpdatedAt\s*\}/);
assert.match(respond, /const pausedReinvite = Boolean/);
assert.match(respond, /preorderStatus === LimitedPreorderStatus\.PAUSED/);
assert.match(respond, /preorderStatus !== LimitedPreorderStatus\.NOT_STARTED[\s\S]*&& !pausedReinvite/);
assert.match(respond, /tx\.projectDesignAuthorization\.updateMany\(\{[\s\S]*updatedAt: expectedUpdatedAt/);
assert.match(respond, /tx\.collaborationProject\.updateMany\(\{[\s\S]*updatedAt: authorization\.project\.updatedAt[\s\S]*designerAuthorizationStatus: authorization\.project\.designerAuthorizationStatus/);
assert.match(respond, /if \(authorizationChanged\.count !== 1\)/);
assert.match(respond, /if \(projectChanged\.count !== 1\)/);
assert.match(respond, /authorization\.project\.presaleCampaign\?\.preorderStatus === LimitedPreorderStatus\.PAUSED/);
assert.match(respond, /status: CollaborationProjectStatus\.PREORDER_READY/);
assert.match(respond, /action: "PROJECT_DESIGN_AUTHORIZATION_RESPONSE"/);

// Revoke blocks irreversible lifecycle states and atomically turns OPEN into PAUSED before commit.
assert.match(revoke, /tx\.projectDesignAuthorization\.findUnique/);
assert.match(revoke, /LimitedPreorderStatus\.GOAL_REACHED/);
assert.match(revoke, /LimitedPreorderStatus\.PRODUCTION/);
assert.match(revoke, /tx\.projectDesignAuthorization\.updateMany\(\{[\s\S]*status: ProjectDesignAuthorizationStatus\.ACCEPTED[\s\S]*updatedAt: authorization\.updatedAt/);
assert.match(revoke, /tx\.collaborationProject\.updateMany\(\{[\s\S]*updatedAt: authorization\.project\.updatedAt/);
assert.match(revoke, /campaign\?\.preorderStatus === LimitedPreorderStatus\.OPEN/);
assert.match(revoke, /tx\.presaleCampaign\.updateMany\(\{\s*where: \{ id: campaign\.id, preorderStatus: LimitedPreorderStatus\.OPEN \}/);
assert.match(revoke, /preorderStatus: LimitedPreorderStatus\.PAUSED/);
assert.match(revoke, /tx\.projectProduct\.updateMany\(\{\s*where: \{ projectId, preorderCampaignId: campaign\.id, status: "PREORDER_OPEN" \}/);
assert.match(revoke, /data: \{ status: "PAUSED" \}/);
assert.match(revoke, /tx\.commerceStateEvent\.create/);
assert.match(revoke, /reason: "DESIGN_AUTHORIZATION_REVOKED"/);
assert.match(revoke, /action: "PROJECT_DESIGN_AUTHORIZATION_REVOKE"/);

console.log("project design authorization transaction contract tests: PASS");
