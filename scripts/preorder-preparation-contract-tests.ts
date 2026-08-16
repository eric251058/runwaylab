import { readFileSync } from "node:fs";
import {
  CollaborationProjectStatus,
  ProjectDesignAuthorizationStatus,
  ProjectProductStatus
} from "@prisma/client";
import { canSetProjectProductStatus } from "../src/lib/projects/rules";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(label + ": expected " + String(expected) + ", received " + String(actual));
}

assertEqual("draft requires authorization", canSetProjectProductStatus(
  CollaborationProjectStatus.DRAFT,
  ProjectProductStatus.DRAFT,
  ProjectDesignAuthorizationStatus.PENDING
), false);
assertEqual("authorized draft is allowed", canSetProjectProductStatus(
  CollaborationProjectStatus.PLANNING,
  ProjectProductStatus.DRAFT,
  ProjectDesignAuthorizationStatus.ACCEPTED
), true);
assertEqual("approved product requires preorder-ready project", canSetProjectProductStatus(
  CollaborationProjectStatus.PLANNING,
  ProjectProductStatus.APPROVED,
  ProjectDesignAuthorizationStatus.ACCEPTED
), false);
assertEqual("approved product allowed when ready", canSetProjectProductStatus(
  CollaborationProjectStatus.PREORDER_READY,
  ProjectProductStatus.APPROVED,
  ProjectDesignAuthorizationStatus.ACCEPTED
), true);
assertEqual("open product requires open project", canSetProjectProductStatus(
  CollaborationProjectStatus.PREORDER_READY,
  ProjectProductStatus.PREORDER_OPEN,
  ProjectDesignAuthorizationStatus.ACCEPTED
), false);
assertEqual("open product allowed on open project", canSetProjectProductStatus(
  CollaborationProjectStatus.PREORDER_OPEN,
  ProjectProductStatus.PREORDER_OPEN,
  ProjectDesignAuthorizationStatus.ACCEPTED
), true);

const page = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");
const actions = readFileSync("src/lib/commercial-collaboration-actions.ts", "utf8");
const decisionPage = readFileSync("src/app/admin/presale-campaigns/page.tsx", "utf8");
for (const required of ["预订准备工作台", "不会自动创建订单、扣款、生产任务或收入", "价格（分）"]) {
  if (!page.includes(required)) throw new Error("preorder preparation page missing: " + required);
}
for (const required of ["requireAdminUser()", "canSetProjectProductStatus", "existing.projectId !== projectId"]) {
  if (!actions.includes(required)) throw new Error("product action guard missing: " + required);
}
if (!decisionPage.includes('"/preorder"') || !decisionPage.includes("准备限量预订")) {
  throw new Error("presale decision page missing preorder preparation entry");
}

console.log("preorder preparation contract: PASS");
