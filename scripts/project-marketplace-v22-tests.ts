import {
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  ProjectDesignAuthorizationStatus,
  ProjectIssueType,
  ProjectProductStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { parseProjectIssueRequest } from "@/lib/projects/issues";
import {
  calculateOrderTotal,
  canDesignerRespondToAuthorization,
  canManageProject,
  canOpenLimitedPreorder,
  canTransitionProjectStatus,
  canViewProject,
  formatMoneyCents,
  nextAuthorizationRequestData,
  ownerCannotRespondToAuthorization,
  PROJECT_ISSUE_TYPE_LABELS,
  projectIssueTypeFromInput
} from "@/lib/projects/rules";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

function main() {
  const user = { id: "user_1", role: UserRole.USER, status: UserStatus.ACTIVE };
  const admin = { id: "admin_1", role: UserRole.ADMIN, status: UserStatus.ACTIVE };
  const project = {
    status: CollaborationProjectStatus.PREORDER_READY,
    visibility: CollaborationProjectVisibility.PUBLIC,
    designerId: "designer_1",
    ownerUserId: "owner_1",
    createdById: "admin_1",
    work: { userId: "designer_1" }
  };

  assertEqual("public project visible", canViewProject(user, project), true);
  assertEqual("admin can manage", canManageProject(admin, project), true);
  assertEqual("random user cannot manage", canManageProject(user, project), false);
  assertEqual("designer can manage", canManageProject({ ...user, id: "designer_1" }, project), true);
  assertEqual("preorder can open approved product", canOpenLimitedPreorder(CollaborationProjectStatus.PREORDER_READY, ProjectProductStatus.APPROVED), true);
  assertEqual("preorder blocked without authorization", canOpenLimitedPreorder(CollaborationProjectStatus.PREORDER_READY, ProjectProductStatus.APPROVED, ProjectDesignAuthorizationStatus.PENDING), false);
  assertEqual("draft product cannot preorder", canOpenLimitedPreorder(CollaborationProjectStatus.PREORDER_READY, ProjectProductStatus.DRAFT), false);
  assertEqual("project cannot enter preorder without accepted authorization", canTransitionProjectStatus(CollaborationProjectStatus.PREORDER_OPEN, ProjectDesignAuthorizationStatus.PENDING), false);
  assertEqual("project can enter preorder after accepted authorization", canTransitionProjectStatus(CollaborationProjectStatus.PREORDER_OPEN, ProjectDesignAuthorizationStatus.ACCEPTED), true);
  assertEqual("money stays integer cents", calculateOrderTotal(12900, 2), 25800);
  assertEqual("money text", formatMoneyCents(25800), "¥258.00");

  for (const type of Object.values(ProjectIssueType)) {
    assertEqual(`issue type ${type} accepted`, projectIssueTypeFromInput(type), type);
    if (!PROJECT_ISSUE_TYPE_LABELS[type]) throw new Error(`missing label for ${type}`);
  }
  assertEqual("invalid issue type rejected", projectIssueTypeFromInput("BAD_TYPE"), null);
  assertEqual("issue schema accepts valid type", parseProjectIssueRequest({ type: ProjectIssueType.DELAY, title: "项目延期" }).success, true);
  assertEqual("issue schema rejects invalid type", parseProjectIssueRequest({ type: "BAD_TYPE", title: "问题" }).success, false);
  assertEqual("issue schema rejects client reporterId", parseProjectIssueRequest({ type: ProjectIssueType.OTHER, title: "问题", reporterId: "attacker" }).success, false);
  assertEqual("issue schema rejects client userId", parseProjectIssueRequest({ type: ProjectIssueType.OTHER, title: "问题", userId: "attacker" }).success, false);

  const authorization = {
    designerUserId: "designer_1",
    ownerUserId: "owner_1",
    status: ProjectDesignAuthorizationStatus.PENDING
  };
  assertEqual("designer can accept authorization", canDesignerRespondToAuthorization({ ...user, id: "designer_1" }, authorization), true);
  assertEqual("project owner cannot accept authorization", ownerCannotRespondToAuthorization({ ...user, id: "owner_1" }, authorization), true);
  assertEqual("non author cannot accept authorization", canDesignerRespondToAuthorization(user, authorization), false);
  const reapply = nextAuthorizationRequestData("v2");
  assertEqual("revoked authorization can reapply pending", reapply.status, ProjectDesignAuthorizationStatus.PENDING);
  assertEqual("reapply clears acceptedAt", reapply.acceptedAt, null);
  assertEqual("reapply clears revokedAt", reapply.revokedAt, null);

  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260716210000_unified_v234_v23_foundation/migration.sql", "utf8");
  assertEqual("projectId unique in schema", schema.includes("@@unique([projectId])"), true);
  assertEqual("projectId unique in migration", migration.includes('CREATE UNIQUE INDEX "ProjectDesignAuthorization_projectId_key"'), true);
}

try {
  main();
} catch (error) {
  console.error("Project marketplace V2.2 tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
}
