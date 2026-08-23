import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("src/app/api/provider/showcase/extract/route.ts", "utf8");
const form = readFileSync("src/components/provider-center/ProviderShowcaseForm.tsx", "utf8");

assert.match(route, /ProviderType\.FACTORY/, "factory providers must be supported");
assert.match(route, /ProviderType\.SAMPLE_STUDIO/, "sample studios must be supported");
assert.match(route, /ProviderStatus\.ACTIVE/, "AI intake must require an active provider");
assert.match(route, /aiProductExtractionEnabled/, "AI intake must respect provider entitlements");
assert.match(route, /consumeProviderAiExtraction/, "AI intake must consume the shared monthly quota");
assert.match(route, /checkRateLimits/, "AI intake must be rate limited");
assert.match(route, /\/uploads\/work\//, "only the showcase upload path may be used locally");
assert.match(route, /AI_ALLOWED_IMAGE_HOST/, "remote images must use an explicitly allowed host");
assert.match(route, /store: false/, "AI requests must not be stored by the model provider");
assert.match(route, /strict: true/, "AI output must use a strict JSON schema");
assert.match(route, /draftSchema\.parse/, "AI output must be validated before returning");
assert.match(route, /禁止猜测/, "the prompt must forbid guessing");
assert.match(route, /不得虚构客户、品牌、认证、产能/, "the prompt must forbid invented commercial claims");
assert.match(route, /不得提取姓名、电话、地址、订单号/, "the prompt must protect personal information");

assert.match(form, /fetch\("\/api\/provider\/showcase\/extract"/, "the showcase form must call the dedicated endpoint");
assert.match(form, /ProviderType\.FACTORY \|\| providerType === ProviderType\.SAMPLE_STUDIO/, "only relevant provider types should see the helper");
assert.match(form, /if \(control\.value\.trim\(\)\) continue/, "AI must never overwrite a provider field");
assert.match(form, /AI 只填空白字段，不覆盖你的内容/, "the form must explain non-overwrite behavior");
assert.match(form, /资料由你核对并决定是否发布/, "the provider must keep editorial control");
assert.match(form, /action=\{saveProviderShowcaseItem\}/, "existing provider self-publish flow must remain intact");
assert.match(form, /onUploadingChange=\{setIsUploading\}/, "AI action must wait for image upload completion");

console.log("provider showcase AI intake contract tests: PASS");
