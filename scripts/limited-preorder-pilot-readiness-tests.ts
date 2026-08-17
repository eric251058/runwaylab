import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LimitedPreorderQualificationMode,
  LimitedPreorderStatus
} from "@prisma/client";
import {
  groupPilotReadinessIssues,
  isPilotLifecycleConfigurable,
  LIMITED_PREORDER_PILOT_TEMPLATE,
  pilotReadinessAction,
  pilotSafetyIssues
} from "../src/lib/projects/preorder-pilot-readiness";

assert.equal(LIMITED_PREORDER_PILOT_TEMPLATE.qualificationMode, LimitedPreorderQualificationMode.CONFIRMED_ORDER);
assert.equal(LIMITED_PREORDER_PILOT_TEMPLATE.acceptsPayment, false);
assert.ok(LIMITED_PREORDER_PILOT_TEMPLATE.principles.some((item) => item.includes("不在线收款")));

assert.deepEqual(pilotSafetyIssues(LimitedPreorderQualificationMode.CONFIRMED_ORDER), []);
assert.equal(pilotSafetyIssues(LimitedPreorderQualificationMode.PAID_ORDER)[0]?.code, "PILOT_MODE");

const grouped = groupPilotReadinessIssues([
  { code: "WORK_QUALITY", message: "作品不合格" },
  { code: "DEMAND_TARGET", message: "需求未达标" },
  { code: "TERMS_TEXT", message: "条款未锁定" },
  { code: "SKU_REQUIRED", message: "缺少 SKU" },
  { code: "PILOT_MODE", message: "付款模式未开放" }
]);
assert.deepEqual(grouped.map((item) => item.area), [
  "关联与作品",
  "需求与授权",
  "活动条款",
  "商品与 SKU",
  "试点安全"
]);
assert.equal(pilotReadinessAction("project-1", "WORK_QUALITY").href, "/admin/works");
assert.equal(pilotReadinessAction("project-1", "DEMAND_TARGET").href, "/admin/presale-intents");
assert.equal(pilotReadinessAction("project-1", "SKU_REQUIRED").href, "/admin/projects/project-1/preorder");

assert.equal(isPilotLifecycleConfigurable(LimitedPreorderStatus.NOT_STARTED), true);
assert.equal(isPilotLifecycleConfigurable(LimitedPreorderStatus.PAUSED), true);
assert.equal(isPilotLifecycleConfigurable(LimitedPreorderStatus.OPEN), false);
assert.equal(isPilotLifecycleConfigurable(LimitedPreorderStatus.CLOSED), false);

const dashboard = readFileSync("src/app/admin/preorders/readiness/page.tsx", "utf8");
assert.match(dashboard, /evaluateLimitedPreorderAdmission/);
assert.match(dashboard, /isPublicQualityWork/);
assert.match(dashboard, /presaleCampaignId:\s*\{\s*not:\s*null\s*\}/);
assert.match(dashboard, /pilotSafetyIssues\(campaign\.preorderQualificationMode\)/);
assert.match(dashboard, /feature\.limited_preorder_v23/);
assert.match(dashboard, /首个候选完成验收前应保持关闭/);
assert.doesNotMatch(dashboard, /prisma\.[A-Za-z]+\.(create|update|delete|upsert)\(/);
assert.doesNotMatch(dashboard, /save[A-Z][A-Za-z]+/);

const legal = readFileSync("src/app/legal/presale-rules/page.tsx", "utf8");
assert.match(legal, /需求验证仅用于收集市场兴趣和需求信号/);
assert.match(legal, /限量预售不等于现货/);
assert.match(legal, /首期限量预售试点采用人工确认订单意向模式/);
assert.match(legal, /不提供在线付款，不收取定金/);
assert.match(legal, /退款完成以实际退款记录为准/);
assert.match(legal, /规则版本：V2\.3-PILOT-2026-08/);

const adminHome = readFileSync("src/app/admin/page.tsx", "utf8");
assert.match(adminHome, /\/admin\/preorders\/readiness/);
assert.match(adminHome, /限量预售试点准入/);

const workbench = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
assert.match(workbench, /试点准入总览/);

console.log("limited preorder pilot readiness tests: PASS");
