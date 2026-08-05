import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");

assert.match(service, /prisma\.\$transaction\(/, "conversion should use a transaction");
assert.match(service, /TransactionIsolationLevel\.Serializable/, "conversion transaction should request serializable isolation");
assert.match(service, /updateMany\(\{[\s\S]*updatedAt:\s*expectedUpdatedAt/, "conversion should use optimistic locking with updatedAt");
assert.match(service, /if \(updated\.count !== 1\)[\s\S]*ProjectIntakeConversionConflictError/, "stale conversion should roll back");
assert.match(service, /tx\.collaborationProject\.create/, "formal project creation should happen inside the transaction");
assert.match(service, /tx\.projectIntakeEvent\.create/, "conversion event should happen inside the transaction");
assert.match(service, /tx\.adminLog\.create/, "admin log should happen inside the transaction");
assert.match(service, /createProjectIntakeConvertedNotification\(tx/, "notification should happen inside the transaction");

console.log("project intake conversion transaction tests passed");
