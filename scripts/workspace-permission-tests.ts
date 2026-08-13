import assert from "node:assert/strict";
import {
  canCreateWorkspaceContent,
  canEditWorkspaceWork,
  canManageWorkspace,
  canViewWork
} from "../src/lib/workspace-permissions";

const owner = { role: "OWNER", status: "ACTIVE" } as const;
const admin = { role: "ADMIN", status: "ACTIVE" } as const;
const member = { role: "MEMBER", status: "ACTIVE" } as const;
const leftMember = { role: "MEMBER", status: "LEFT" } as const;

assert.equal(canManageWorkspace(owner), true);
assert.equal(canManageWorkspace(admin), true);
assert.equal(canManageWorkspace(member), false);
assert.equal(canManageWorkspace(leftMember), false);

assert.equal(canCreateWorkspaceContent(member), true);
assert.equal(canCreateWorkspaceContent(leftMember), false);

assert.equal(
  canEditWorkspaceWork({ actorUserId: "author", authorUserId: "author", access: null }),
  true
);
assert.equal(
  canEditWorkspaceWork({ actorUserId: "member", authorUserId: "author", access: member }),
  false
);
assert.equal(
  canEditWorkspaceWork({ actorUserId: "admin", authorUserId: "author", access: admin }),
  true
);
assert.equal(
  canEditWorkspaceWork({ actorUserId: "former", authorUserId: "author", access: leftMember }),
  false
);

assert.equal(
  canViewWork({ actorUserId: null, authorUserId: "author", visibility: "PUBLIC", access: null }),
  true
);
assert.equal(
  canViewWork({ actorUserId: "member", authorUserId: "author", visibility: "COLLABORATORS", access: member }),
  true
);
assert.equal(
  canViewWork({ actorUserId: "former", authorUserId: "author", visibility: "COLLABORATORS", access: leftMember }),
  false
);
assert.equal(
  canViewWork({ actorUserId: "member", authorUserId: "author", visibility: "PRIVATE", access: member }),
  false
);
assert.equal(
  canViewWork({ actorUserId: "admin", authorUserId: "author", visibility: "PRIVATE", access: admin }),
  true
);

console.log("workspace-permission-tests: PASS");
