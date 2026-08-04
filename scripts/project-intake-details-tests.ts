import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");
const component = readFileSync("src/components/start/ProjectIntakeDetailsFlow.tsx", "utf8");
const page = readFileSync("src/app/me/start-projects/[id]/page.tsx", "utf8");

assert.match(validation, /projectTitleSchema/, "projectTitle should have a dedicated safe validator");
assert.match(validation, /targetAudienceSchema/, "targetAudience should be validated");
assert.match(validation, /USE_SCENARIO_VALUES/, "useScenario should be whitelist validated");
assert.match(validation, /EXPECTED_PRICE_BAND_VALUES/, "expectedPriceBand should be whitelist validated");
assert.match(validation, /LAUNCH_TIMING_VALUES/, "launchTiming should be whitelist validated");
assert.match(validation, /reviewMessageSchema/, "reviewMessage should be bounded");
assert.match(component, /这件产品主要为谁而做？/, "details flow should ask one main audience question");
assert.match(component, /价格和时间范围/, "details flow should split price and timing into a short step");
assert.match(component, /检查项目资料/, "details flow should include a review step");
assert.match(page, /robots:\s*\{\s*index:\s*false/, "private intake detail should be noindex");
assert.doesNotMatch(component, /alert\(|window\.confirm|confirm\(/, "details flow should not use browser alert or confirm");
assert.doesNotMatch(component, /type="file"|ImageUploader|\/api\/upload/, "details flow should not upload draft images");

console.log("project intake details tests passed");
