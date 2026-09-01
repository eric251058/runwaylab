import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const marketplace = readFileSync("src/app/projects/page.tsx", "utf8");
const flow = readFileSync("src/components/start/StartProjectFlow.tsx", "utf8");
const details = readFileSync("src/components/start/ProjectIntakeDetailsFlow.tsx", "utf8");

assert.match(marketplace, /href="\/start"/, "marketplace creation CTA should use the real start route");
assert.doesNotMatch(marketplace, /href="\/start-project"/, "marketplace must not link to the removed route");
assert.match(flow, /保存并继续完善/, "initial intake must be presented as a saved draft, not a published project");
assert.match(details, /公开发布项目/, "public co-creation must expose an explicit publish action");
assert.match(details, /认证前项目可以被浏览，但设计师暂时不能提交方案/, "commitment verification must gate proposals rather than marketplace visibility");

console.log("project marketplace entry tests passed");
