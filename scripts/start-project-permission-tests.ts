import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createRoute = readFileSync("src/app/api/start-projects/route.ts", "utf8");
const itemRoute = readFileSync("src/app/api/start-projects/[id]/route.ts", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");

assert.match(createRoute, /getCurrentUser\(\)/, "create route must read the current session user");
assert.match(createRoute, /createProjectIntakeForUser\(user\.id, body\)/, "ownerId must come from the server session");
assert.doesNotMatch(createRoute, /ownerId:\s*body|body\.ownerId|rawInput\.ownerId/, "create route must not accept ownerId from clients");
assert.match(service, /ownerId:\s*userId/, "ProjectIntake owner should be bound to session user id");
assert.match(service, /ownerId_clientDraftId/, "ProjectIntake creation should be idempotent by ownerId and clientDraftId");
assert.match(validation, /\.strict\(\)/, "input schemas should reject unknown client fields");
assert.match(validation, /z\.enum\(START_SOURCE_VALUES\)/, "sourceType must be whitelist validated");
assert.match(validation, /z\.enum\(START_CATEGORY_VALUES\)/, "category must be whitelist validated");
assert.match(validation, /z\.enum\(START_NEED_VALUES\)/, "primaryNeed must be whitelist validated");
assert.match(itemRoute, /getProjectIntakeForViewer/, "single item route should use protected loader");
assert.match(itemRoute, /updateProjectIntakeForViewer/, "single item update should use protected updater");
assert.match(service, /canViewProjectIntake/, "service should expose owner/admin visibility guard");
assert.match(service, /user\.id === intake\.ownerId \|\| isActiveAdmin\(user\)/, "only owner or admin should view an intake");
assert.match(itemRoute, /status: 403|无权/, "unauthorized updates should be rejected naturally");
assert.doesNotMatch(service, /email|phone|wechat|contact/, "ProjectIntake service should not expose contact fields");

console.log("start project permission tests passed");
