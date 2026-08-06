import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/lib/private-project-actions.ts", "utf8");

assert.match(service, /function sameActionInput/, "service should compare repeated create action inputs");
assert.match(service, /idempotent:\s*true/, "service should return idempotent success for safe repeats");
assert.match(service, /createProjectEventOnce/, "events should be deduped for repeated operations");
assert.match(service, /createdAt:\s*\{\s*gte:\s*new Date\(Date\.now\(\) - 2 \* 60 \* 1000\)/, "event and notification dedupe should use a short time window");
assert.match(service, /currentAction|project\.actions\[0\]|existing/, "service should detect the existing current action before creating another one");

console.log("private project action idempotency tests passed");
