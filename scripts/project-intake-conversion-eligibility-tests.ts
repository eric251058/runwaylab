import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const service = readFileSync("src/lib/start-projects.ts", "utf8");
const panel = readFileSync("src/components/admin/ProjectIntakeConversionPanel.tsx", "utf8");
const adminDetailPath = "src/app/admin/project-intakes/[id]/page.tsx";
const convertRoutePath = "src/app/api/admin/project-intakes/[id]/convert/route.ts";

assert.equal(existsSync(adminDetailPath), true, "admin intake detail page should exist");
assert.equal(existsSync(convertRoutePath), true, "admin conversion API route should exist");
assert.match(service, /current\.status !== ProjectIntakeStatus\.ACCEPTED/, "only ACCEPTED intakes can be converted");
assert.match(service, /linkedCollaborationProjectId:\s*null/, "conversion should require no existing linked project");
assert.match(service, /convertedAt:\s*null/, "conversion should require no previous converted timestamp");
assert.match(panel, /const canConvert = status === "ACCEPTED"/, "admin UI should only enable conversion for ACCEPTED intakes");
assert.match(panel, /当前状态不能建立正式项目/, "admin UI should explain non-convertible states");

console.log("project intake conversion eligibility tests passed");
