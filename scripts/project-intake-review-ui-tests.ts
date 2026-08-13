import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const userFlow = readFileSync("src/components/start/ProjectIntakeDetailsFlow.tsx", "utf8");
const adminPanel = readFileSync("src/components/admin/ProjectIntakeReviewPanel.tsx", "utf8");
const adminList = readFileSync("src/app/admin/project-intakes/page.tsx", "utf8");
const adminHome = readFileSync("src/app/admin/page.tsx", "utf8");

assert.match(userFlow, /补充项目资料/, "user flow should expose one clear primary action");
assert.match(userFlow, /确认启动项目？/, "submit should use the simple launch confirmation");
assert.match(userFlow, /撤回并修改？/, "withdraw should use custom confirmation");
assert.match(userFlow, /平台反馈/, "NEEDS_INFO and result feedback should be visible");
assert.match(adminPanel, /通过评估/, "admin panel should expose accept action");
assert.match(adminPanel, /需要补充/, "admin panel should expose needs info action");
assert.match(adminPanel, /确认暂不适合？/, "decline should require custom confirmation");
assert.match(adminList, /等待评估/, "admin list should default around waiting review");
assert.match(adminHome, /启动项目评估/, "admin home should link to project intake review");
assert.doesNotMatch(userFlow + adminPanel, /window\.confirm|alert\(/, "new review UI must not use alert or native confirm");

console.log("project intake review UI tests passed");
