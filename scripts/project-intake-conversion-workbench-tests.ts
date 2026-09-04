import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const startProjects = readFileSync("src/lib/start-projects.ts", "utf8");
const privateProjects = readFileSync("src/lib/private-collaboration-projects.ts", "utf8");
const meProjects = readFileSync("src/app/me/projects/page.tsx", "utf8");
const detailPagePath = "src/app/me/projects/collaboration/[id]/page.tsx";
const detailPage = readFileSync(detailPagePath, "utf8");

assert.equal(existsSync(detailPagePath), true, "private collaboration project detail page should exist");
assert.match(startProjects, /getProjectIntakesForUser[\s\S]*linkedCollaborationProjectId:\s*null/, "converted intakes should be hidden from the draft list");
assert.match(privateProjects, /getPrivateCollaborationProjectsForUser/, "private formal projects should have a dedicated list loader");
assert.match(privateProjects, /visibility:\s*CollaborationProjectVisibility\.PRIVATE/, "private list loader should only fetch private projects");
assert.match(privateProjects, /OR:\s*\[[\s\S]*ownerUserId:\s*userId[\s\S]*designerId:\s*userId[\s\S]*provider:\s*\{\s*ownerId:\s*userId\s*\}/, "private list loader should include every project assigned to the current user");
assert.match(meProjects, /getPrivateCollaborationProjectsForUser\(user\.id\)/, "/me/projects should include intake-converted formal projects");
assert.match(meProjects, /totalProjectCount = publishedProjects\.length \+ intakes\.length \+ collaborationProjects\.length/, "/me/projects should include each project source once");
assert.doesNotMatch(meProjects, /stat\(|启动草稿|正式项目/, "/me/projects should not expose internal source-count panels");
assert.match(detailPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/, "private formal project page should be noindex");

console.log("project intake conversion workbench tests passed");
