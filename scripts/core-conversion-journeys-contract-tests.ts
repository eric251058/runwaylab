import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

const providerRoute = source("src/app/api/provider/onboarding/route.ts");
const providerForm = source("src/app/providers/apply/SubmitProviderApplicationForm.tsx");
assert.match(providerRoute, /providerApplication\.create/, "provider onboarding must enter the review queue");
assert.match(providerRoute, /ProviderApplicationStatus\.PENDING/, "provider onboarding must default to pending review");
assert.doesNotMatch(providerRoute, /status:\s*ProviderStatus\.ACTIVE/, "provider onboarding must not self-activate");
assert.match(providerForm, /提交后立即获得私有工作台/, "provider onboarding must start in a private workspace");
assert.match(providerForm, /可由你自助开通公开主页/, "ready providers must control when their public page opens");
assert.match(providerForm, /平台仅处理重复主体与风险异常/, "platform work must stay limited to exception governance");
assert.match(providerForm, /acceptRules/, "provider application must require explicit rule acceptance");
assert.match(providerForm, /legal\/collaboration-rules/, "provider application must link to the rules it asks users to accept");
assert.doesNotMatch(providerForm, /稍后完善/, "provider onboarding must not offer a public-profile bypass");

const startPage = source("src/app/start/page.tsx");
const startFlow = source("src/components/start/StartProjectFlow.tsx");
const startValidation = source("src/lib/start-projects/validation.ts");
const startService = source("src/lib/start-projects.ts");
assert.match(startPage, /prisma\.work\.findMany/, "start page must load the current user's works");
assert.match(startFlow, /linkedWorkId/, "existing-work start must submit the selected work");
assert.match(startFlow, /选择要继续推进的作品/, "existing-work start must provide a real work picker");
assert.match(startValidation, /sourceType === "DESIGN" && !value\.linkedWorkId/, "design starts must require a work selection");
assert.match(startService, /userId,\s*contentStatus:/, "server must verify selected work ownership and availability");
assert.match(startService, /linkedWorkId: nextData\.linkedWorkId/, "idempotent intake updates must retain the selected work");
assert.match(source("src/components/start/ProjectIntakeDetailsFlow.tsx"), /项目关联作品/, "project overview must keep the selected work visible");

const publishForm = source("src/components/publish/PublishWorkForm.tsx");
assert.match(publishForm, /作品已提交审核/, "publish success must describe the actual review state");
assert.match(publishForm, /审核通过后，作品会进入公开作品库/, "publish success must explain when public visibility begins");
assert.doesNotMatch(publishForm, /作品已发布<\/h1>/, "pending work must not be presented as already published");

console.log("core conversion journeys contract tests: PASS");
