import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectOpportunityNeeds } from "../src/lib/project-applications";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260816090000_add_project_applications/migration.sql", "utf8");
const actions = readFileSync("src/lib/project-application-actions.ts", "utf8");
const marketplace = readFileSync("src/app/projects/page.tsx", "utf8");
const detail = readFileSync("src/app/projects/[id]/page.tsx", "utf8");
const center = readFileSync("src/app/me/project-applications/page.tsx", "utf8");
const notifications = readFileSync("src/lib/notifications.ts", "utf8");

assert.ok(schema.includes("model ProjectApplication {"));
assert.ok(schema.includes("@@unique([projectId, applicantId, role])"));
assert.ok(migration.includes('CREATE TABLE "ProjectApplication"'));
assert.ok(migration.includes("ON DELETE CASCADE"));

assert.ok(actions.includes("publicProjectWhere()"));
assert.ok(actions.includes("applicationDeadline"));
assert.ok(actions.includes("projectId_applicantId_role"));
assert.ok(actions.includes("workspaceMember.upsert"));
assert.ok(actions.includes('role: "MEMBER"'));
assert.ok(actions.includes('status: "ACTIVE"'));
assert.ok(actions.includes("你没有审核该项目申请的权限"));
assert.ok(!center.includes("applicant.email") && !center.includes("applicant.phone"));

assert.match(marketplace, /name="q"/);
assert.match(marketplace, /name="stage"/);
assert.match(marketplace, /name="need"/);
assert.match(detail, /submitProjectApplication/);
assert.match(detail, /申请不是雇佣、订单或付款承诺/);
assert.match(center, /reviewProjectApplication/);
assert.match(center, /withdrawProjectApplication/);
assert.match(notifications, /PROJECT_APPLICATION_RECEIVED/);
assert.match(notifications, /PROJECT_APPLICATION_UPDATED/);

assert.deepEqual(
  projectOpportunityNeeds({
    ownerUserId: null,
    ownerProviderId: null,
    fabricId: null,
    providerId: null,
    presaleCampaignId: null
  }).map((item) => item.key),
  ["lead", "fabric", "production", "market"]
);
assert.deepEqual(
  projectOpportunityNeeds({
    ownerUserId: "owner",
    ownerProviderId: null,
    fabricId: "fabric",
    providerId: "provider",
    presaleCampaignId: "campaign"
  }),
  []
);

console.log("project participation marketplace contracts: PASS");
