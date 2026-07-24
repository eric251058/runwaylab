import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ContentStatus, ReviewStatus } from "@prisma/client";
import { canHardDeleteWork, canOfflineWork, canResubmitOfflineWork, lifecycleConflict } from "../src/lib/content-lifecycle";

const noDependencies = {
  comments: 0,
  likes: 0,
  favorites: 0,
  recommendations: 0,
  inquiries: 0,
  incubation: 0,
  presale: 0,
  projects: 0,
  providerOpportunityInterests: 0
};

assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.PENDING, contentStatus: ContentStatus.VISIBLE }, noDependencies), true);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.REJECTED, contentStatus: ContentStatus.VISIBLE }, noDependencies), true);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.APPROVED, contentStatus: ContentStatus.VISIBLE }, noDependencies), false);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.PENDING, contentStatus: ContentStatus.VISIBLE }, { ...noDependencies, comments: 1 }), false);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.PENDING, contentStatus: ContentStatus.VISIBLE }, { ...noDependencies, recommendations: 1 }), false);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.PENDING, contentStatus: ContentStatus.VISIBLE }, { ...noDependencies, inquiries: 1 }), false);
assert.equal(canHardDeleteWork({ reviewStatus: ReviewStatus.PENDING, contentStatus: ContentStatus.VISIBLE }, { ...noDependencies, incubation: 1, presale: 1 }), false);
assert.equal(canOfflineWork({ reviewStatus: ReviewStatus.APPROVED, contentStatus: ContentStatus.VISIBLE }), true);
assert.equal(canResubmitOfflineWork({ reviewStatus: ReviewStatus.OFFLINE, contentStatus: ContentStatus.OFFLINE }), true);
assert.deepEqual(lifecycleConflict("blocked", { comments: 1, likes: 0 }).dependencies, { comments: 1 });

const routeSource = readFileSync("src/app/api/works/[id]/route.ts", "utf8");
assert.match(routeSource, /getWorkDeleteDependencies/, "DELETE should check dependencies on server");
assert.match(routeSource, /status: 409/, "dependency conflicts should return 409");
assert.doesNotMatch(routeSource, /ownerId.*request|body.*ownerId/, "API must not trust client supplied ownerId");

console.log("work lifecycle tests passed");
