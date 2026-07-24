import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ProviderShowcaseStatus } from "@prisma/client";
import { canHardDeleteShowcase, canOfflineShowcase, canResubmitShowcase } from "../src/lib/content-lifecycle";

assert.equal(canHardDeleteShowcase({ status: ProviderShowcaseStatus.DRAFT }, { inquiries: 0 }), true);
assert.equal(canHardDeleteShowcase({ status: ProviderShowcaseStatus.REJECTED }, { inquiries: 0 }), true);
assert.equal(canHardDeleteShowcase({ status: ProviderShowcaseStatus.PENDING_REVIEW }, { inquiries: 0 }), true);
assert.equal(canHardDeleteShowcase({ status: ProviderShowcaseStatus.PUBLISHED }, { inquiries: 0 }), false);
assert.equal(canHardDeleteShowcase({ status: ProviderShowcaseStatus.DRAFT }, { inquiries: 1 }), false);
assert.equal(canOfflineShowcase({ status: ProviderShowcaseStatus.PUBLISHED }), true);
assert.equal(canResubmitShowcase({ status: ProviderShowcaseStatus.ARCHIVED }), true);

const actionsSource = readFileSync("src/lib/provider-center-actions.ts", "utf8");
const centerSource = readFileSync("src/app/provider-center/showcase/page.tsx", "utf8");
const publicDetailSource = readFileSync("src/app/providers/[id]/showcase/[itemId]/page.tsx", "utf8");

assert.match(actionsSource, /getShowcaseDeleteDependencies/, "showcase delete should check inquiries");
assert.match(actionsSource, /ProviderShowcaseStatus\.ARCHIVED/, "published showcase should go offline through ARCHIVED");
assert.match(centerSource, /下架案例/, "provider showcase center should expose offline action");
assert.match(centerSource, /重新提交/, "archived showcase should be resubmittable");
assert.match(publicDetailSource, /status:\s*ProviderShowcaseStatus\.PUBLISHED/, "public showcase detail should only show published items");

console.log("provider showcase lifecycle tests passed");
