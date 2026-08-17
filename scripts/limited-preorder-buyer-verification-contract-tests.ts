import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/admin-user-actions.ts", "utf8");
const usersPage = readFileSync("src/app/admin/users/page.tsx", "utf8");
const profileRoute = readFileSync("src/app/api/me/profile/route.ts", "utf8");
const service = readFileSync("src/lib/projects/preorder-service.ts", "utf8");

const verificationAction = actions.slice(actions.indexOf("export async function verifyPilotBuyerContact"));
assert.match(verificationAction, /isAdmin\(admin\)/);
assert.match(verificationAction, /confirmContactOwnership/);
assert.match(verificationAction, /evidenceRef\.length < 4/);
assert.match(verificationAction, /evidenceSummary\.length < 10/);
assert.match(verificationAction, /role:\s*\{ not: UserRole\.ADMIN \}/);
assert.match(verificationAction, /updatedAt:\s*target\.updatedAt/);
assert.match(verificationAction, /emailVerifiedAt:\s*now/);
assert.match(verificationAction, /phoneVerifiedAt:\s*now/);
assert.match(verificationAction, /TransactionIsolationLevel\.Serializable/);
assert.match(verificationAction, /LIMITED_PREORDER_BUYER_CONTACT_VERIFY/);
assert.match(verificationAction, /tx\.notification\.create/);
assert.match(verificationAction, /不在线收款、不收定金/);

assert.match(usersPage, /verifyPilotBuyerContact/);
assert.match(usersPage, /完整用户 ID、邮箱、手机号或昵称搜索/);
assert.match(usersPage, /站外回拨、邮件回复或等效方式/);
assert.match(usersPage, /confirmContactOwnership/);

// A verified phone cannot be replaced while retaining the old ownership proof.
assert.match(profileRoute, /phoneVerifiedAt:\s*phoneChanged\s*\?\s*null\s*:\s*undefined/);
assert.match(service, /BUYER_CONTACT_VERIFICATION_REQUIRED/);
assert.match(service, /hasVerifiedBuyerContact\(buyerAccount\)/);

console.log("limited preorder buyer verification contract tests: PASS");
