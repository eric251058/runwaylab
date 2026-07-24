import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FabricStatus } from "@prisma/client";
import { canHardDeleteFabric, canOfflineFabric, canRestoreFabric } from "../src/lib/content-lifecycle";

const noDependencies = { recommendations: 0, inquiries: 0, projects: 0 };

assert.equal(canHardDeleteFabric({ status: FabricStatus.INACTIVE }, noDependencies), true);
assert.equal(canHardDeleteFabric({ status: FabricStatus.UNKNOWN }, noDependencies), true);
assert.equal(canHardDeleteFabric({ status: FabricStatus.ACTIVE }, noDependencies), false);
assert.equal(canHardDeleteFabric({ status: FabricStatus.INACTIVE }, { ...noDependencies, recommendations: 1 }), false);
assert.equal(canOfflineFabric({ status: FabricStatus.ACTIVE }), true);
assert.equal(canRestoreFabric({ status: FabricStatus.INACTIVE }), true);
assert.equal(canRestoreFabric({ status: FabricStatus.ARCHIVED }), true);

const actionsSource = readFileSync("src/lib/provider-center-actions.ts", "utf8");
const pageSource = readFileSync("src/app/provider-center/fabrics/page.tsx", "utf8");
const publicListSource = readFileSync("src/app/fabrics/page.tsx", "utf8");
const publicDetailSource = readFileSync("src/app/fabrics/[id]/page.tsx", "utf8");

assert.match(actionsSource, /getFabricDeleteDependencies/, "fabric delete should check business dependencies");
assert.match(actionsSource, /FabricStatus\.INACTIVE/, "fabric offline should reuse INACTIVE status");
assert.match(pageSource, /下架面料/, "provider fabric center should expose offline action");
assert.match(pageSource, /恢复展示/, "provider fabric center should expose restore action");
assert.match(publicListSource, /status: "ACTIVE"/, "public fabric list should only show active fabrics");
assert.match(publicDetailSource, /status: "ACTIVE"/, "public fabric detail should hide offline fabrics");

console.log("provider fabric lifecycle tests passed");
