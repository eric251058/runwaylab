import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync("src/lib/projects/market-validation.ts", "utf8");
const route = fs.readFileSync("src/app/api/me/projects/collaboration/[id]/market-validation/route.ts", "utf8");
const component = fs.readFileSync("src/components/projects/ProjectMarketValidation.tsx", "utf8");
const page = fs.readFileSync("src/app/me/projects/collaboration/[id]/page.tsx", "utf8");

assert.match(service, /PUBLIC_COCREATION/);
assert.match(service, /CollaborationProjectVisibility\.PUBLIC/);
assert.match(service, /ProjectDesignAuthorizationStatus\.ACCEPTED/);
assert.match(service, /ProjectCommerceStage\.SAMPLE/);
assert.match(service, /ProjectStageStatus\.COMPLETED/);
assert.match(service, /presaleCampaignId: null/);
assert.match(service, /TransactionIsolationLevel\.Serializable/);
assert.match(service, /PresaleCampaignStatus\.ACTIVE/);
assert.doesNotMatch(service, /ProjectOrder\.create|projectOrder\.create|paymentAttempt\.create/);
assert.match(route, /feature\.demand_commerce/);
assert.match(route, /getCurrentUser/);
assert.match(component, /意向不是订单/);
assert.match(component, /不收款/);
assert.match(page, /marketValidationEligible/);

console.log("project market validation self-service tests passed");
