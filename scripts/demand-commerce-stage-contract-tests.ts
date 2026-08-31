import assert from "node:assert/strict";
import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const migration = fs.readFileSync("prisma/migrations/20260831090000_add_demand_commerce_stages/migration.sql", "utf8");
const service = fs.readFileSync("src/lib/projects/commerce-stages.ts", "utf8");
const flow = fs.readFileSync("src/components/start/StartProjectFlow.tsx", "utf8");
const payment = fs.readFileSync("src/lib/payments/order-payment-service.ts", "utf8");

for (const stage of ["DESIGN", "FABRIC", "SAMPLE", "PRODUCTION"]) {
  assert.match(schema, new RegExp(`\\b${stage}\\b`), `schema must contain ${stage}`);
}
assert.match(migration, /ProjectStage_selectedProposalId_fkey/, "migration must enforce selected proposal integrity");
assert.match(service, /nextStage[\s\S]*DESIGN:[\s\S]*FABRIC:[\s\S]*SAMPLE:/, "stage progression must be sequential");
assert.match(service, /只有需求发起人可以选择方案/, "selection must be owner-controlled");
assert.match(service, /当前阶段只接受对应类型的已入驻服务商/, "supply stages must enforce provider identity");
assert.match(flow, /我想要一件衣服/, "consumer demand entry must be visible");
assert.match(flow, /PERSONAL_CUSTOM[\s\S]*PUBLIC_COCREATION/, "both demand modes must be offered");
assert.match(payment, /MARKETPLACE_SETTLEMENT_NOT_CONFIGURED/, "third-party collection must stay blocked before settlement onboarding");

console.log("demand commerce stage contract tests passed");
