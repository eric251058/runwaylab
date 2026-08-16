import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collaboration = readFileSync("src/lib/commercial-collaboration.ts", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");
const publicList = readFileSync("src/app/projects/page.tsx", "utf8");
const publicDetail = readFileSync("src/app/projects/[id]/page.tsx", "utf8");

assert.match(collaboration, /publicProjectWhere\(\)[\s\S]*visibility:\s*CollaborationProjectVisibility\.PUBLIC/, "public project filter must require PUBLIC visibility");
assert.match(service, /visibility:\s*CollaborationProjectVisibility\.PRIVATE/, "converted projects should default to PRIVATE");
assert.match(service, /status:\s*CollaborationProjectStatus\.DRAFT/, "converted projects should default to DRAFT");
assert.match(publicList, /filters:[\s\S]*\[publicProjectWhere\(\)\]/, "public project list should seed every search with the public filter");
assert.match(publicDetail, /AND:\s*\[publicProjectWhere\(\)/, "public project detail should use the public filter");
assert.doesNotMatch(service, /revalidatePath\("\/projects"\)[\s\S]*PROJECT_INTAKE_CONVERT/, "conversion should not push private projects into public project pages");

console.log("project intake conversion public isolation tests passed");
