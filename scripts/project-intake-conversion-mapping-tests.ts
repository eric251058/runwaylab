import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const service = readFileSync("src/lib/start-projects.ts", "utf8");

const conversionCreateBlock = service.match(/tx\.collaborationProject\.create\(\{[\s\S]*?createdById:\s*admin\.id[\s\S]*?\n\s*\}\);\n\n\s*const updated/)?.[0] ?? "";

assert.match(schema, /model CollaborationProject \{[\s\S]*workId\s+String\?/, "CollaborationProject workId should be optional for intake-converted projects");
assert.match(schema, /projectIntake\s+ProjectIntake\?\s+@relation\("ProjectIntakeLinkedCollaborationProject"\)/, "CollaborationProject should have a one-to-one intake relation");
assert.match(conversionCreateBlock, /title:\s*projectIntakeTitle\(current\)/, "converted project title should come from intake data");
assert.match(conversionCreateBlock, /ownerUserId:\s*current\.ownerId/, "converted project owner should be the intake owner");
assert.match(conversionCreateBlock, /createdById:\s*admin\.id/, "converted project creator should be session admin");
assert.match(conversionCreateBlock, /status:\s*current\.demandMode === "PUBLIC_COCREATION" \? CollaborationProjectStatus\.SEEKING_PROPOSALS : CollaborationProjectStatus\.DRAFT/, "public co-creation should open for proposals while personal projects remain drafts");
assert.match(conversionCreateBlock, /visibility:\s*current\.demandMode === "PUBLIC_COCREATION" \? CollaborationProjectVisibility\.PUBLIC : CollaborationProjectVisibility\.PRIVATE/, "only explicit public co-creation should publish during conversion");
assert.doesNotMatch(conversionCreateBlock, /workId:/, "conversion must not invent a Work link");
assert.doesNotMatch(conversionCreateBlock, /incubationProject|ProviderProposal|ProjectOrder/, "conversion must not create downstream business objects");

console.log("project intake conversion mapping tests passed");
