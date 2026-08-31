import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const startPage = readFileSync("src/app/start/page.tsx", "utf8");
const flow = readFileSync("src/components/start/StartProjectFlow.tsx", "utf8");

assert.match(startPage, /StartProjectFlow/, "/start should render the start project flow");
assert.match(startPage, /normalizeStartSourceParam/, "/start should sanitize source query parameters on the server");
assert.match(startPage, /getCurrentUser/, "/start should receive login state from the server without polling");
assert.match(flow, /你想从哪里开始？/, "step 1 should ask one main source question");
assert.match(flow, /你想做什么产品？/, "step 2 should ask one main category question");
assert.match(flow, /你现在最需要哪一步？/, "step 3 should ask one main need question");
assert.match(flow, /这个需求怎样推进？/, "step 4 should choose personal or public co-creation");
assert.match(flow, /补充场景、预算和时间/, "step 5 should collect commercial constraints");
assert.match(flow, /描述你真正想要的衣服/, "step 6 should collect the demand brief");
const sourceOptions = flow.slice(flow.indexOf("const sourceOptions"), flow.indexOf("const categoryOptions"));
assert.match(sourceOptions, /选择已有作品/, "source option DESIGN should be concrete and action-oriented");
assert.match(sourceOptions, /创建产品想法/, "source option IDEA should be concrete and action-oriented");
assert.match(sourceOptions, /我想要一件衣服/, "source option NEED should expose the consumer demand entry");
assert.doesNotMatch(sourceOptions, /AUDIENCE|STORE|BRAND/, "the first decision should expose only the three core starting points");
assert.match(flow, /连衣裙/, "priority category should exist");
assert.match(flow, /针织/, "knit category should exist");
assert.match(flow, /找设计方向/, "design direction need should exist");
assert.match(flow, /我还不确定/, "unsure need should exist");
assert.match(flow, /\{draft\.step \+ 1\} \/ 6/, "flow should show the guided 1 / 6 step indicator");
assert.match(flow, /创建我的项目/, "final primary action should create the project");
assert.match(flow, /图片和更完整的资料可以在项目创建后继续补充/, "flow should explain progressive disclosure in customer language");
assert.doesNotMatch(flow, /公开 uploads/, "flow must not expose internal storage implementation language");
assert.doesNotMatch(flow, /type="file"|ImageUploader|\/api\/upload/, "start flow must not upload draft images in this round");
assert.doesNotMatch(flow, /alert\(|confirm\(/, "start flow should not use browser alert or confirm");

console.log("start project flow tests passed");
