import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboardingRoute = readFileSync("src/app/api/provider/onboarding/route.ts", "utf8");
const adminActions = readFileSync("src/lib/provider-market-admin.ts", "utf8");
const centerActions = readFileSync("src/lib/provider-center-actions.ts", "utf8");
const centerPage = readFileSync("src/app/provider-center/page.tsx", "utf8");
const adminPage = readFileSync("src/app/admin/provider-applications/page.tsx", "utf8");
const publicRules = readFileSync("src/lib/supply-network.ts", "utf8");
const draftRules = readFileSync("src/lib/provider-self-service.ts", "utf8");

assert.match(onboardingRoute, /prisma\.\$transaction/, "quick onboarding must create application and workspace atomically");
assert.match(onboardingRoute, /providerDataFromApplication/, "quick onboarding must use safe draft defaults");
assert.match(adminActions, /providerDataFromApplication/, "full onboarding and admin review must share provider mapping");
assert.match(draftRules, /status: ProviderStatus\.PENDING/, "new workspaces must start private");
assert.match(draftRules, /opportunityVisible: false/, "new workspaces must not enter public opportunity matching");
assert.match(draftRules, /isVerified: false/, "self-service must not grant a platform verification badge");
assert.match(publicRules, /status: ProviderStatus\.ACTIVE/, "public directory must exclude pending workspaces");
assert.match(centerActions, /activateProviderSelfService/, "provider must control when its public page opens");
assert.match(centerActions, /providerDuplicateRisks/, "self-service opening must stop high-risk duplicate identities");
assert.match(centerActions, /ProviderShowcaseStatus\.PUBLISHED/, "active providers must be able to publish their own cases");
assert.match(centerPage, /自助开通公开主页/, "workbench must expose one clear opening action");
assert.match(adminPage, /服务商异常治理/, "admin area must be framed as exception governance");
assert.match(adminPage, /无需后台操作/, "normal self-service applications must not invite manual work");

console.log("provider self-service contract tests: PASS");
