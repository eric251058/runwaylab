import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collaboration = readFileSync("src/lib/commercial-collaboration.ts", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const publicList = readFileSync("src/app/projects/page.tsx", "utf8");
const publicDetail = readFileSync("src/app/projects/[id]/page.tsx", "utf8");

assert.match(collaboration, /publicProjectWhere\(\)[\s\S]*visibility:\s*CollaborationProjectVisibility\.PUBLIC/, "public project filter must require PUBLIC visibility");
assert.match(service, /visibility:\s*current\.demandMode === "PUBLIC_COCREATION" \? CollaborationProjectVisibility\.PUBLIC : CollaborationProjectVisibility\.PRIVATE/, "conversion should publish only an explicit public co-creation request");
assert.match(service, /status:\s*current\.demandMode === "PUBLIC_COCREATION" \? CollaborationProjectStatus\.SEEKING_PROPOSALS : CollaborationProjectStatus\.DRAFT/, "public co-creation should open for proposals while personal projects remain drafts");
assert.match(publicList, /filters:[\s\S]*\[publicProjectWhere\(\)\]/, "public project list should seed every search with the public filter");
assert.match(publicDetail, /AND:\s*\[publicProjectWhere\(\)/, "public project detail should use the public filter");
assert.match(service, /current\.demandMode === "PUBLIC_COCREATION" \? CollaborationProjectVisibility\.PUBLIC : CollaborationProjectVisibility\.PRIVATE/, "private conversion must remain isolated from public project queries");

console.log("project intake conversion public isolation tests passed");
