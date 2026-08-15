import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/presale/page.tsx", "utf8");

assert.match(page, /publicProjectWhere/);
assert.match(page, /collaborationProjects/);
assert.match(page, /canOpenLimitedPreorder/);
assert.match(page, /designerAuthorizationStatus/);
assert.match(page, /preorderProject\.slug \?\? preorderProject\.id/);
assert.match(page, /进入项目并选择规格/);
assert.match(page, /查看作品并提交意向/);

console.log("presale-conversion-tests: PASS");
