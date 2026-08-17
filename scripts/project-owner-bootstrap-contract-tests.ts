import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const action = readFileSync("src/lib/projects/owner-actions.ts", "utf8");
const page = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");

assert.match(action, /await requireAdminUser\(\)/);
assert.match(action, /runProjectOwnerBootstrapTransaction/);
assert.match(action, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
assert.match(action, /Prisma\.TransactionIsolationLevel\.Serializable/);
assert.match(action, /error\.code === "P2034"/);

const transactionStart = action.indexOf("runProjectOwnerBootstrapTransaction(async (tx) =>");
const projectRead = action.indexOf("tx.collaborationProject.findUnique", transactionStart);
const userRead = action.indexOf("tx.user.findUnique", transactionStart);
const authorizationRead = action.indexOf("tx.projectDesignAuthorization.findFirst", transactionStart);
const orderRead = action.indexOf("tx.projectOrder.count", transactionStart);
const casWrite = action.indexOf("tx.collaborationProject.updateMany", transactionStart);
const auditWrite = action.indexOf("tx.adminLog.create", transactionStart);
const notification = action.indexOf("tx.notification.create", auditWrite);

assert(transactionStart >= 0);
assert(projectRead > transactionStart);
assert(userRead > transactionStart);
assert(authorizationRead > transactionStart);
assert(orderRead > transactionStart);
assert(casWrite > orderRead);
assert(auditWrite > casWrite);
assert(notification > auditWrite);

assert.match(action, /owner\.status !== UserStatus\.ACTIVE/);
assert.match(action, /owner\.role === UserRole\.ADMIN/);
assert.match(action, /formData\.get\("confirm"\) !== "yes"/);
assert.match(action, /legacyAdminCreatedProject/);
assert.match(action, /project\.createdBy\?\.role === UserRole\.ADMIN/);
assert.match(action, /OWNER_BOOTSTRAP_BLOCKED_PROJECT_STATUSES\.includes\(project\.status\)/);
assert.match(action, /project\.presaleCampaign\.preorderStatus !== LimitedPreorderStatus\.NOT_STARTED/);
assert.match(action, /authorization\?\.status === ProjectDesignAuthorizationStatus\.ACCEPTED/);
assert.match(action, /existingAuthorizationStatus: authorization\?\.status \?\? null/);
assert.match(action, /if \(orderCount > 0\)/);

assert.match(action, /where: \{[\s\S]*id: project\.id[\s\S]*status: project\.status[\s\S]*ownerUserId: null[\s\S]*createdById: project\.createdById[\s\S]*presaleCampaignId: project\.presaleCampaignId[\s\S]*updatedAt: project\.updatedAt/);
assert.match(action, /if \(updated\.count !== 1\)/);
assert.match(action, /action: "COLLABORATION_PROJECT_OWNER_BOOTSTRAP"/);
assert.match(action, /authorizationCreated: false/);
assert.match(action, /authorDecisionChanged: false/);
assert.match(action, /type: NotificationType\.REQUEST_HANDLED/);
assert.doesNotMatch(action, /createNotificationSafe/);

assert.doesNotMatch(action, /projectDesignAuthorization\.(create|update|updateMany|delete|deleteMany)/);
assert.doesNotMatch(action, /presaleCampaign\.(create|update|updateMany|delete)/);
assert.doesNotMatch(action, /data: \{[\s\S]*designerAuthorizationStatus:/);

assert.match(page, /assignCollaborationProjectOwner/);
assert.match(page, /status: UserStatus\.ACTIVE/);
assert.match(page, /role: \{ not: UserRole\.ADMIN \}/);
assert.match(page, /project\.ownerUserId === null/);
assert.match(page, /project\.createdById === null \|\| legacyAdminCreatedProject/);
assert.match(page, /project\.createdBy\?\.role === UserRole\.ADMIN/);
assert.match(page, /authorization\?\.status !== ProjectDesignAuthorizationStatus\.ACCEPTED/);
assert.match(page, /_count: \{ select: \{ orders: true \} \}/);
assert.match(page, /project\._count\.orders === 0/);
assert.match(page, /name="ownerQuery"/);
assert.match(page, /nickname: \{ contains: ownerQuery/);
assert.match(page, /email: \{ contains: ownerQuery/);
assert.match(page, /take: 50/);
assert.doesNotMatch(page, /take: 500/);
assert.match(page, /name="ownerUserId"/);
assert.match(page, /name="confirm" value="yes" required/);
assert.match(page, /只登记已经核实的真实负责人身份/);
assert.match(page, /不代替负责人发送邀请/);
assert.match(page, /不代替作品作者接受或拒绝/);

console.log("project owner bootstrap contract tests: PASS");
