import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/works/[id]/provider-proposals/route.ts", "utf8");
const workPageSource = readFileSync("src/app/works/[id]/page.tsx", "utf8");
const dialogSource = readFileSync("src/components/works/ProviderWorkSupportDialog.tsx", "utf8");
const centerSource = readFileSync("src/app/provider-center/recommendations/page.tsx", "utf8");

assert.match(routeSource, /const \{ id: workId \}/, "recommendation API must bind workId from route context");
assert.match(routeSource, /providerId: provider\.id/, "recommendation API must use current user's provider");
assert.doesNotMatch(routeSource, /body\.providerId|parsed\.data\.providerId/, "providerId must not be accepted from client payload");
assert.match(routeSource, /ProviderWorkProposalType\.FABRIC/, "generic recommendations should support fabric type");
assert.match(routeSource, /ProviderWorkProposalType\.SAMPLE/, "generic recommendations should support sample type");
assert.match(routeSource, /ProviderWorkProposalType\.PRODUCTION/, "generic recommendations should support production type");
assert.match(routeSource, /createNotificationSafe/, "designer should be notified for new provider recommendations");
assert.match(workPageSource, /<ProviderWorkSupportDialog/, "work detail should expose provider recommendation entry");
assert.match(dialogSource, /推荐面料或服务/, "dialog copy should use unified recommendation language");
assert.doesNotMatch(dialogSource, /name="workId"|workOptions|选择作品/, "provider should not manually choose work inside work context");
assert.match(centerSource, /providerWorkProposal\.findMany/, "provider center should list service recommendations");

console.log("provider recommendation tests passed");
