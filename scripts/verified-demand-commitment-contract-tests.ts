import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260901090000_add_verified_demand_commitment/migration.sql", "utf8");
const stages = readFileSync("src/lib/projects/commerce-stages.ts", "utf8");
const start = readFileSync("src/lib/start-projects.ts", "utf8");
const proposalForm = readFileSync("src/components/projects/StageProposalForm.tsx", "utf8");
const workbench = readFileSync("src/components/projects/ProjectCommerceStages.tsx", "utf8");
const publicPage = readFileSync("src/app/projects/[id]/page.tsx", "utf8");
const intakeValidation = readFileSync("src/lib/start-projects/validation.ts", "utf8");
const intakeFlow = readFileSync("src/components/start/ProjectIntakeDetailsFlow.tsx", "utf8");

assert.match(schema, /enum ProjectCommitmentStatus \{[\s\S]*NOT_REQUIRED[\s\S]*REQUIRED[\s\S]*EVIDENCE_PENDING[\s\S]*VERIFIED[\s\S]*REJECTED[\s\S]*\}/);
assert.match(schema, /commitmentAmount\s+Int\?/);
assert.match(schema, /commitmentVerifiedById\s+String\?/);
assert.match(schema, /revisionRounds\s+Int\s+@default\(1\)/);
assert.match(schema, /acceptanceCriteria\s+Json\?/);
assert.match(migration, /ProjectStage_commitmentAmount_nonnegative/);
assert.match(migration, /ProjectStageProposal_revisionRounds_range/);

assert.match(start, /current\.sourceType === "NEED"[\s\S]*commitmentStatus: "REQUIRED"[\s\S]*commitmentAmount: 9_900/);
assert.match(intakeValidation, /budgetBreakdownSchema/);
assert.match(start, /设计、面料与打样预算/);
assert.match(start, /estimatedBudget: budget\?\.summary/);
assert.match(intakeFlow, /真实可执行预算/);
assert.match(stages, /MAX_ACTIVE_STAGE_PROPOSALS = 5/);
assert.match(stages, /activeCount >= MAX_ACTIVE_STAGE_PROPOSALS/);
assert.match(stages, /TransactionIsolationLevel\.Serializable/);
assert.match(stages, /error\.code !== "P2034"/);
assert.match(stages, /需求方尚未完成项目启动金认证/);
assert.match(stages, /项目启动金或阶段启动款尚未核验/);
assert.match(stages, /remainingCommitment = Math\.max\(0, \(proposal\.price \?\? 0\) - certifiedAmount\)/);
assert.match(stages, /只有需求发起人可以提交付款凭证/);
assert.match(stages, /reviewer\.role !== "ADMIN"/);

for (const requirement of ["price", "leadTimeDays", "deliverables", "commercialNote", "revisionRounds", "acceptanceCriteria"]) {
  assert.match(stages, new RegExp(`${requirement}:`), `proposal contract must require ${requirement}`);
}
assert.match(proposalForm, /第一轮不要求免费完成正式设计/);
assert.match(proposalForm, /客观验收标准/);
assert.match(proposalForm, /版权或商业授权边界/);
assert.match(workbench, /每阶段最多 5 个候选/);
assert.match(workbench, /不会把它显示成支付宝收款/);
assert.match(publicPage, /认证后才开放设计师响应/);
assert.match(publicPage, /本阶段已收到 5 个有效候选方案/);

console.log("verified demand commitment contract tests: PASS");
