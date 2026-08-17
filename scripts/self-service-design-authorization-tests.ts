import assert from "node:assert/strict";
import { CollaborationProjectStatus, UserRole, UserStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { canRequestProjectDesignAuthorization } from "../src/lib/projects/rules";

const project = {
  status: CollaborationProjectStatus.PLANNING,
  ownerUserId: "owner",
  createdById: "creator",
  designerId: null,
  work: { userId: "author" }
};

const user = (id: string, role: UserRole = UserRole.USER, status: UserStatus = UserStatus.ACTIVE) => ({ id, role, status });

assert.equal(canRequestProjectDesignAuthorization(user("owner"), project), true);
assert.equal(canRequestProjectDesignAuthorization(user("creator"), project), true);
assert.equal(canRequestProjectDesignAuthorization(user("author"), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("admin", UserRole.ADMIN), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("owner", UserRole.USER, UserStatus.BANNED), project), false);
assert.equal(canRequestProjectDesignAuthorization(user("author"), { ...project, ownerUserId: "author" }), true);

const actions = readFileSync("src/lib/projects/actions.ts", "utf8");
const policy = readFileSync("src/lib/projects/design-authorization-policy.ts", "utf8");
const authorizationsPage = readFileSync("src/app/me/authorizations/page.tsx", "utf8");
const adminPage = readFileSync("src/app/admin/projects/[id]/preorder/page.tsx", "utf8");

const requestStart = actions.indexOf("export async function requestProjectDesignAuthorization");
const requestEnd = actions.indexOf("export async function respondProjectDesignAuthorization", requestStart);
assert(requestStart >= 0 && requestEnd > requestStart);
const request = actions.slice(requestStart, requestEnd);

assert.match(request, /canRequestProjectDesignAuthorization\(user, project\)/);
assert.match(request, /PROJECT_DESIGN_AUTHORIZATION_TERMS_VERSION/);
assert.match(request, /PROJECT_DESIGN_AUTHORIZATION_SCOPE/);
assert.match(request, /PROJECT_DESIGN_AUTHORIZATION_ROYALTY_NOTICE/);
assert.match(request, /requestMode: "SELF_SERVICE_STANDARD"/);
assert.match(request, /recipientId: project\.work\.userId/);
assert.doesNotMatch(request, /formData\.get\("termsVersion"\)/);
assert.doesNotMatch(request, /formData\.get\("scope"\)/);
assert.doesNotMatch(request, /formData\.get\("royaltyDescription"\)/);

assert.match(policy, /未经作者另行书面同意，不得转让著作权、进行平台外授权或进入量产/);
assert.match(policy, /不确认分成比例或结算金额/);

assert.match(authorizationsPage, /OR: \[\{ ownerUserId: user\.id \}, \{ createdById: user\.id \}\]/);
assert.match(authorizationsPage, /form action=\{requestProjectDesignAuthorization\}/);
assert.match(authorizationsPage, /邀请作者参与/);
assert.match(authorizationsPage, /等待作者决定/);
assert.match(authorizationsPage, /作者已同意/);
assert.match(authorizationsPage, /respondProjectDesignAuthorization/);
assert.match(authorizationsPage, /revokeProjectDesignAuthorization/);

assert.doesNotMatch(adminPage, /requestProjectDesignAuthorization/);
assert.doesNotMatch(adminPage, /name="termsVersion"/);
assert.doesNotMatch(adminPage, /name="scope"/);
assert.match(adminPage, /平台不代替双方作商业决定/);
assert.match(adminPage, /前往授权中心/);

console.log("self-service design authorization tests: PASS");
