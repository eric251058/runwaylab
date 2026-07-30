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
assert.match(flow, /写一句话，给项目一个起点/, "step 4 should ask for a short starting point");
assert.match(flow, /我有设计作品/, "source option DESIGN should exist");
assert.match(flow, /我有产品想法/, "source option IDEA should exist");
assert.match(flow, /我有粉丝或客户/, "source option AUDIENCE should exist");
assert.match(flow, /我有服装店/, "source option STORE should exist");
assert.match(flow, /我已经有品牌/, "source option BRAND should exist");
assert.match(flow, /连衣裙/, "priority category should exist");
assert.match(flow, /针织/, "knit category should exist");
assert.match(flow, /找设计方向/, "design direction need should exist");
assert.match(flow, /我还不确定/, "unsure need should exist");
assert.match(flow, /\{draft\.step \+ 1\} \/ 4/, "flow should show a restrained 1 / 4 step indicator");
assert.match(flow, /创建我的项目/, "final primary action should create the project");
assert.match(flow, /图片可在项目建立后补充/, "flow should communicate the simplified image plan");
assert.doesNotMatch(flow, /type="file"|ImageUploader|\/api\/upload/, "start flow must not upload draft images in this round");
assert.doesNotMatch(flow, /alert\(|confirm\(/, "start flow should not use browser alert or confirm");

console.log("start project flow tests passed");
