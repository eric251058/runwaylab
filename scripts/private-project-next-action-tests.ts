import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CollaborationProjectActionResponsibility,
  CollaborationProjectActionStatus,
  CollaborationProjectActionType
} from "@prisma/client";
import {
  derivePrivateProjectStage,
  privateProjectActionSummary
} from "../src/lib/private-project-actions";

const privateProjectLib = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");
const userDetail = readFileSync("src/app/me/projects/collaboration/[id]/page.tsx", "utf8");

assert.equal(derivePrivateProjectStage(null), "PROJECT_SETUP");
assert.equal(derivePrivateProjectStage({ type: CollaborationProjectActionType.FABRIC_BRIEF, status: CollaborationProjectActionStatus.ACTIVE }), "FABRIC_PREPARATION");
assert.equal(derivePrivateProjectStage({ type: CollaborationProjectActionType.SAMPLE_BRIEF, status: CollaborationProjectActionStatus.ACTIVE }), "SAMPLE_PREPARATION");
assert.equal(derivePrivateProjectStage({ type: CollaborationProjectActionType.PRODUCTION_FEASIBILITY, status: CollaborationProjectActionStatus.ACTIVE }), "PRODUCTION_PREPARATION");
assert.equal(
  privateProjectActionSummary({
    type: CollaborationProjectActionType.DESIGN_CLARIFICATION,
    responsibility: CollaborationProjectActionResponsibility.USER,
    status: CollaborationProjectActionStatus.ACTIVE,
    title: "补充设计方向"
  }).stage,
  "DESIGN_DIRECTION"
);
assert.match(privateProjectLib, /privateProjectNextAction\(project/, "next action should be derived from project actions");
assert.match(userDetail, /PrivateProjectActionCard/, "user private detail page should render the current action card");

console.log("private project next action tests passed");
