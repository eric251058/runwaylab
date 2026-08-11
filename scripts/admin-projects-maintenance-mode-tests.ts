import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPage = readFileSync("src/app/admin/projects/page.tsx", "utf8");

assert.match(adminPage, /mode\?: string/, "admin projects page should accept a mode query");
assert.match(adminPage, /const maintenanceMode = params\?\.mode === "maintenance"/, "heavy maintenance data should be gated behind maintenance mode");
assert.match(adminPage, /const privateProjects = await getAdminPrivateProjects/, "private project queue should load independently from maintenance data");
assert.match(adminPage, /maintenanceMode\s*\?\s*await Promise\.all/, "legacy maintenance queries should only run in maintenance mode");
assert.match(adminPage, /合作项目维护/, "admin page should keep an explicit maintenance entry");
assert.match(adminPage, /默认页面只加载私人项目运营队列/, "default admin page should explain the lightweight queue mode");
assert.doesNotMatch(
  adminPage,
  /const \[privateProjects, projects, works, providers, fabrics, campaigns, schools, teachers\] = await Promise\.all/,
  "private queue should not be bundled with heavy legacy maintenance queries"
);

console.log("admin projects maintenance mode tests passed");
