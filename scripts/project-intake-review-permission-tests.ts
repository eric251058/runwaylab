import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const reviewRoutePath = "src/app/api/admin/project-intakes/[id]/review/route.ts";
const adminListPath = "src/app/admin/project-intakes/page.tsx";
const adminDetailPath = "src/app/admin/project-intakes/[id]/page.tsx";
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const reviewRoute = readFileSync(reviewRoutePath, "utf8");

assert.equal(existsSync(reviewRoutePath), true, "admin review API should exist");
assert.equal(existsSync(adminListPath), true, "admin list page should exist");
assert.equal(existsSync(adminDetailPath), true, "admin detail page should exist");
assert.match(reviewRoute, /requireAdminUser\(\)/, "admin review API should use existing admin guard");
assert.match(service, /isActiveAdmin\(admin\)/, "review service should validate admin server-side");
assert.match(service, /reviewedById:\s*admin\.id/, "reviewer id should come from session admin");
assert.doesNotMatch(reviewRoute, /reviewedById|reviewedAt|adminId:\s*body/, "review route must not accept reviewer fields from clients");
assert.match(service, /current\.status !== ProjectIntakeStatus\.SUBMITTED/, "admin can only process SUBMITTED intakes");
assert.match(service, /updateMany\(\{[\s\S]*updatedAt:\s*expectedUpdatedAt/, "admin review should use updatedAt optimistic locking");

console.log("project intake review permission tests passed");
