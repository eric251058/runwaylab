import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getPlatformCapabilityContract,
  PLATFORM_JOURNEYS,
  PLATFORM_PERSONAS,
  PLATFORM_SALES_MODEL,
  PLATFORM_VERSION
} from "../src/lib/platform-capabilities";

const contract = getPlatformCapabilityContract();

assert.equal(PLATFORM_VERSION, "2.0B.6");
assert.equal(contract.schemaVersion, "2026-08-13");
assert.equal(PLATFORM_SALES_MODEL.financialCrowdfunding, false);
assert.equal(PLATFORM_SALES_MODEL.investmentReturn, false);
assert.deepEqual(PLATFORM_JOURNEYS.map((journey) => journey.id), ["creative", "project", "commerce"]);
assert.equal(new Set(PLATFORM_JOURNEYS.flatMap((journey) => journey.stages.map((stage) => stage.id))).size, 10);
assert.ok(PLATFORM_JOURNEYS.flatMap((journey) => journey.stages).every((stage) => stage.href.startsWith("/")));
assert.ok(PLATFORM_PERSONAS.some((persona) => persona.id === "customer" && persona.primaryHref === "/presale"));
assert.ok(PLATFORM_PERSONAS.some((persona) => persona.id === "creator" && persona.primaryHref === "/me/platform"));

const requiredFiles = [
  "src/app/platform/page.tsx",
  "src/app/me/platform/page.tsx",
  "src/app/api/v1/platform/capabilities/route.ts",
  "RUNWAYLAB_FULL_PLATFORM_GAP_AUDIT_V2_0B_6.md"
];

for (const path of requiredFiles) {
  assert.ok(existsSync(path), `Missing platform foundation file: ${path}`);
}

const apiSource = readFileSync("src/app/api/v1/platform/capabilities/route.ts", "utf8");
assert.match(apiSource, /X-RunwayLab-API-Version/);
assert.match(apiSource, /getPlatformCapabilityContract/);

const publicPage = readFileSync("src/app/platform/page.tsx", "utf8");
assert.match(publicPage, /限量预售/);
assert.match(publicPage, /达标生产/);
assert.match(publicPage, /不是投资/);

console.log("platform-foundation-tests: PASS");
