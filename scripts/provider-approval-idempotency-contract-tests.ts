import assert from "node:assert/strict";
import fs from "node:fs";

const actionSource = fs.readFileSync("src/lib/provider-market-admin.ts", "utf8");
const actionStart = actionSource.indexOf("export async function reviewProviderApplication");
const actionEnd = actionSource.indexOf("export async function saveFabric", actionStart);
assert.ok(actionStart >= 0 && actionEnd > actionStart, "review action must be present");
const reviewAction = actionSource.slice(actionStart, actionEnd);

assert.match(reviewAction, /prisma\.\$transaction\(async \(tx\)/, "review must be transactional");
assert.match(reviewAction, /tx.providerApplication.updateMany/, "review must claim a pending application atomically");
assert.match(
  reviewAction,
  /where: { id, status: ProviderApplicationStatus.PENDING }/,
  "only pending applications may be reviewed"
);
assert.match(reviewAction, /claimed.count !== 1/, "repeated or concurrent review must be rejected");
assert.ok(reviewAction.includes("审核状态无效。"), "pending review status must be rejected");
assert.match(reviewAction, /tx.provider.findFirst/, "duplicate lookup must share the transaction");
assert.match(reviewAction, /tx.provider.create/, "provider creation must share the transaction");
assert.match(reviewAction, /tx.provider.update/, "provider binding must share the transaction");
assert.doesNotMatch(
  reviewAction,
  /prisma\.providerApplication\.update\(/,
  "review must not update status outside the transaction"
);

const pageSource = fs.readFileSync("src/app/admin/provider-applications/page.tsx", "utf8");
assert.match(
  pageSource,
  /application\.status === ProviderApplicationStatus\.PENDING \? \(/,
  "review controls must only render for pending applications"
);
assert.match(pageSource, /该申请已完成审核，不可重复操作。/, "completed applications must explain that review is final");

console.log("provider approval idempotency contract tests: PASS");
