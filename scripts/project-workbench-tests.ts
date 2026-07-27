import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CollaborationProjectStatus,
  ContentStatus,
  IncubationApplicationStatus,
  IncubationStatus,
  ProviderWorkProposalStatus,
  ProviderWorkProposalType,
  RecommendationStatus,
  RequestStatus,
  ReviewStatus,
  WorkIncubationStatus
} from "@prisma/client";
import { calculateProjectWorkbenchStage, redactPrivateContact } from "../src/lib/project-workbench";

const emptySignals = {
  reviewStatus: ReviewStatus.APPROVED,
  contentStatus: ContentStatus.VISIBLE,
  wantsIncubation: false,
  incubationStatus: null,
  workIncubation: null,
  incubationApplications: [],
  incubationProjects: [],
  fabricRequests: [],
  fabricRecommendations: [],
  sampleRequests: [],
  providerWorkProposals: [],
  cooperationRequests: [],
  collaborationProjects: []
};

assert.equal(calculateProjectWorkbenchStage(emptySignals), "WORK_PUBLISHED");
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    incubationApplications: [{ status: IncubationApplicationStatus.REVIEWING }]
  }),
  "INCUBATION_CANDIDATE"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    incubationApplications: [{ status: IncubationApplicationStatus.ACCEPTED }]
  }),
  "INCUBATION_CONFIRMED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    fabricRequests: [{ status: RequestStatus.PENDING }]
  }),
  "FABRIC_REQUIREMENT"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    fabricRecommendations: [{ status: RecommendationStatus.PENDING }]
  }),
  "FABRIC_MATCHING"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    fabricRecommendations: [{ status: RecommendationStatus.ACCEPTED }]
  }),
  "FABRIC_SELECTED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    sampleRequests: [{ status: RequestStatus.CONTACTED }]
  }),
  "SAMPLE_REQUESTED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    providerWorkProposals: [{ status: ProviderWorkProposalStatus.PENDING, type: ProviderWorkProposalType.SAMPLE }]
  }),
  "PROPOSAL_RECEIVED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    providerWorkProposals: [{ status: ProviderWorkProposalStatus.ACCEPTED, type: ProviderWorkProposalType.PRODUCTION }]
  }),
  "COOPERATION_CONFIRMED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    incubationProjects: [{ status: IncubationStatus.SAMPLE_MAKING }]
  }),
  "SAMPLE_IN_PROGRESS"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    workIncubation: { status: WorkIncubationStatus.COLLABORATION_REACHED }
  }),
  "COOPERATION_CONFIRMED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    collaborationProjects: [{ status: CollaborationProjectStatus.COMPLETED }]
  }),
  "COMPLETED"
);
assert.equal(
  calculateProjectWorkbenchStage({
    ...emptySignals,
    reviewStatus: ReviewStatus.REJECTED
  }),
  "CANCELLED"
);

assert.equal(redactPrivateContact("email test@example.com phone 13812345678 微信 runwaylab01"), "email [已隐藏邮箱] phone [已隐藏手机号] 联系方式[已隐藏]");

const workbenchLib = readFileSync("src/lib/project-workbench.ts", "utf8");
const overviewPage = readFileSync("src/app/me/projects/page.tsx", "utf8");
const detailPage = readFileSync("src/app/me/projects/[id]/page.tsx", "utf8");

assert.match(workbenchLib, /where: \{ userId \}/, "designer project query must be scoped to the current user");
assert.match(workbenchLib, /prisma\.notification\.findMany/, "notifications should be loaded once as auxiliary events");
assert.doesNotMatch(workbenchLib.replace(/\n/g, " "), /\.(forEach|map)\([^)]*=>[^)]*prisma\./, "project workbench should avoid per-project database queries");
assert.doesNotMatch(`${overviewPage}\n${detailPage}`, /project_marketplace_v22|feature\.demand_v21|feature\.limited_preorder_v23/, "project workbench must not enable gated marketplace, demand, or preorder features");
assert.doesNotMatch(`${overviewPage}\n${detailPage}`, /\.contact\b|contactPhone|contactEmail|wechat|phone\b|email\b/, "project workbench pages should not render private contact fields directly");
assert.match(detailPage, /getDesignerProjectWorkbenchDetail\(user\.id, id\)/, "project detail must re-check ownership on the server");
assert.match(detailPage, /通知不参与核心状态判断/, "detail page should explain notifications are auxiliary");

console.log("project workbench tests passed");
