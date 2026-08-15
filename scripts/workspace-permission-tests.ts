import assert from "node:assert/strict";
import {
  canCreateWorkspaceContent,
  canEditWorkspaceWork,
  canManageWorkspace,
  canViewWork,
  canViewWorkspace,
  canViewWorkspaceMemberEmail
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

assert.equal(canViewWorkspace({ visibility: "PUBLIC", isOwner: false, access: null }), true);
assert.equal(canViewWorkspace({ visibility: "UNLISTED", isOwner: false, access: null }), true);
assert.equal(canViewWorkspace({ visibility: "PRIVATE", isOwner: false, access: null }), false);
assert.equal(canViewWorkspace({ visibility: "PRIVATE", isOwner: false, access: member }), true);
assert.equal(canViewWorkspace({ visibility: "PRIVATE", isOwner: true, access: null }), true);
assert.equal(canViewWorkspace({ visibility: "PRIVATE", isOwner: false, access: null, isGlobalAdmin: true }), true);
assert.equal(canViewWorkspaceMemberEmail(member), true);
assert.equal(canViewWorkspaceMemberEmail(leftMember), false);
assert.equal(canViewWorkspaceMemberEmail(null), false);

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
assert.equal(
  canViewWork({ actorUserId: "platform-admin", authorUserId: "author", visibility: "PRIVATE", access: null, isGlobalAdmin: true }),
  true
);

console.log("workspace-permission-tests: PASS");
