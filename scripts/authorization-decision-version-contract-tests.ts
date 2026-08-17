import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/projects/actions.ts", "utf8");
const page = readFileSync("src/app/me/authorizations/page.tsx", "utf8");
const start = source.indexOf("export async function respondProjectDesignAuthorization");
const end = source.indexOf("export async function revokeProjectDesignAuthorization", start);
assert(start >= 0 && end > start);
const respond = source.slice(start, end);

assert.match(page, /name="authorizationId" value=\{authorization\.id\}/);
assert.equal((page.match(/name="authorizationId"/g) ?? []).length, 2);
assert.match(page, /name="expectedUpdatedAt" value=\{authorization\.updatedAt\.toISOString\(\)\}/);
assert.equal((page.match(/name="expectedUpdatedAt"/g) ?? []).length, 2);

assert.match(respond, /const authorizationId = requiredText\(formData\.get\("authorizationId"\)/);
assert.match(respond, /const expectedUpdatedAtText = requiredText\(formData\.get\("expectedUpdatedAt"\)/);
assert.match(respond, /const expectedUpdatedAt = new Date\(expectedUpdatedAtText\)/);
assert.match(respond, /Number\.isFinite\(expectedUpdatedAt\.getTime\(\)\)/);
assert.match(respond, /where: \{ id: authorizationId \}/);
assert.match(respond, /authorization\.projectId !== projectId/);
assert.match(respond, /authorization\.updatedAt\.getTime\(\) !== expectedUpdatedAt\.getTime\(\)/);
assert.match(respond, /邀请内容或版本已变化/);
assert.match(respond, /where: \{[\s\S]*id: authorizationId[\s\S]*projectId[\s\S]*status: ProjectDesignAuthorizationStatus\.PENDING[\s\S]*updatedAt: expectedUpdatedAt/);

const staleCheck = respond.indexOf("authorization.updatedAt.getTime() !== expectedUpdatedAt.getTime()");
const authorizationWrite = respond.indexOf("tx.projectDesignAuthorization.updateMany");
const projectWrite = respond.indexOf("tx.collaborationProject.updateMany");
const auditWrite = respond.indexOf("tx.adminLog.create");
assert(staleCheck >= 0);
assert(authorizationWrite > staleCheck);
assert(projectWrite > authorizationWrite);
assert(auditWrite > projectWrite);

console.log("authorization decision version contract tests: PASS");
