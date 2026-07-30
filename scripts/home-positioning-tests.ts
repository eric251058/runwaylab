import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePage = readFileSync("src/app/page.tsx", "utf8");

assert.match(homePage, /把服装想法，做成真实产品/, "homepage should use the new public positioning headline");
assert.match(homePage, /href="\/start"/, "primary homepage CTA should point to /start");
assert.match(homePage, /浏览新锐设计[\s\S]*href="\/works"|href="\/works"[\s\S]*浏览新锐设计/, "secondary homepage CTA should point to work discovery");
assert.match(homePage, /我是服务商[\s\S]*\/providers\/apply|\/providers\/apply[\s\S]*我是服务商/, "provider entry should stay lightweight");
assert.match(homePage, /\/start\?source=design/, "design-start entry should use a safe source parameter");
assert.match(homePage, /\/start\?source=idea/, "idea-start entry should use a safe source parameter");
assert.match(homePage, /帮助新锐设计师和品牌主理人/, "homepage should not target only students");
assert.doesNotMatch(homePage, /保证订单|保证融资|免费帮你做品牌|已帮助数百位/, "homepage must not make unsupported success promises");
assert.doesNotMatch(homePage, /机会池正在积累中|正在积累中，可以先发布作品/, "empty opportunity shell should not be rendered");
assert.match(homePage, /qualityOpportunityWorks\.length \?/, "opportunity section should only render when real data exists");
assert.match(homePage, /return isLoggedIn \? "activity" : "inspiration"/, "existing homepage feed mode behavior should remain");

console.log("home positioning tests passed");
