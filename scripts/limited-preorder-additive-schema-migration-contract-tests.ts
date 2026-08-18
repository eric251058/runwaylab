import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync("prisma/schema.prisma", "utf8");

function prismaBlock(kind: "enum" | "model", name: string) {
  const match = schema.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${kind} ${name} must exist`);
  return match[0];
}

const authorization = prismaBlock("model", "ProjectDesignAuthorization");
const order = prismaBlock("model", "ProjectOrder");
const user = prismaBlock("model", "User");
const confirmationChannel = prismaBlock("enum", "ProjectOrderConfirmationChannel");

// Existing authorization rows receive an optional, immutable offer envelope.
assert.match(authorization, /offerHash\s+String\?/);
assert.match(authorization, /offerSnapshot\s+Json\?/);

// A verified no-payment order records how and by whom the buyer's intent was
// confirmed. Every new field is nullable so the change is safe for legacy rows.
for (const value of ["PHONE", "WECHAT", "EMAIL", "IN_PERSON", "OTHER"]) {
  assert.match(confirmationChannel, new RegExp(`\\b${value}\\b`));
}
assert.match(order, /confirmedAt\s+DateTime\?/);
assert.match(order, /confirmedById\s+String\?/);
assert.match(order, /confirmationChannel\s+ProjectOrderConfirmationChannel\?/);
assert.match(order, /confirmationEvidenceRef\s+String\?/);
assert.match(order, /confirmationSummary\s+String\?/);
assert.match(order, /confirmedBy\s+User\?\s+@relation\("ProjectOrderConfirmedBy",\s*fields:\s*\[confirmedById\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/);
assert.match(user, /confirmedProjectOrders\s+ProjectOrder\[\]\s+@relation\("ProjectOrderConfirmedBy"\)/);
const schemaHasCombinedConfirmationIndex = /@@index\(\[confirmedById, confirmedAt\]\)/.test(order);
const schemaHasSeparateConfirmationIndexes = /@@index\(\[confirmedById\]\)/.test(order) && /@@index\(\[confirmedAt\]\)/.test(order);
assert(schemaHasCombinedConfirmationIndex || schemaHasSeparateConfirmationIndexes, "confirmation actor and time must be indexed");

const migrationFiles = readdirSync("prisma/migrations", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    name: entry.name,
    source: readFileSync(join("prisma/migrations", entry.name, "migration.sql"), "utf8")
  }));
const batchMigrations = migrationFiles.filter(({ source }) => (
  source.includes('"offerHash"')
  && source.includes('"offerSnapshot"')
  && source.includes('"confirmationChannel"')
  && source.includes('"confirmationEvidenceRef"')
));

assert.equal(batchMigrations.length, 1, "one additive migration must introduce the offer envelope and verified-order confirmation fields");
const [{ name: migrationName, source: migration }] = batchMigrations;

assert.match(migration, /CREATE TYPE "ProjectOrderConfirmationChannel" AS ENUM \('PHONE', 'WECHAT', 'EMAIL', 'IN_PERSON', 'OTHER'\)/);
assert.match(migration, /ALTER TABLE "ProjectDesignAuthorization"[\s\S]*ADD COLUMN\s+"offerHash" TEXT[\s\S]*ADD COLUMN\s+"offerSnapshot" JSONB/);
assert.match(migration, /ALTER TABLE "ProjectOrder"[\s\S]*ADD COLUMN\s+"confirmedAt" TIMESTAMP\(3\)[\s\S]*ADD COLUMN\s+"confirmedById" TEXT[\s\S]*ADD COLUMN\s+"confirmationChannel" "ProjectOrderConfirmationChannel"[\s\S]*ADD COLUMN\s+"confirmationEvidenceRef" TEXT[\s\S]*ADD COLUMN\s+"confirmationSummary" TEXT/);
const migrationHasCombinedConfirmationIndex = /CREATE INDEX "ProjectOrder_confirmedById_confirmedAt_idx" ON "ProjectOrder"\("confirmedById", "confirmedAt"\)/.test(migration);
const migrationHasSeparateConfirmationIndexes = /CREATE INDEX "ProjectOrder_confirmedById_idx" ON "ProjectOrder"\("confirmedById"\)/.test(migration)
  && /CREATE INDEX "ProjectOrder_confirmedAt_idx" ON "ProjectOrder"\("confirmedAt"\)/.test(migration);
assert(migrationHasCombinedConfirmationIndex || migrationHasSeparateConfirmationIndexes, `${migrationName}: confirmation actor and time must be indexed`);
assert.match(migration, /ALTER TABLE "ProjectOrder"\s+ADD CONSTRAINT "ProjectOrder_confirmedById_fkey"\s+FOREIGN KEY \("confirmedById"\) REFERENCES "User"\("id"\) ON DELETE SET NULL ON UPDATE CASCADE/);

for (const column of [
  "offerHash",
  "offerSnapshot",
  "confirmedAt",
  "confirmedById",
  "confirmationChannel",
  "confirmationEvidenceRef",
  "confirmationSummary"
]) {
  assert.doesNotMatch(
    migration,
    new RegExp(`ADD COLUMN\\s+"${column}"[^,;\\n]*NOT NULL`, "i"),
    `${migrationName}: ${column} must remain nullable for existing production rows`
  );
}

// This production migration is schema-only and strictly additive. It may create
// a type, nullable columns, an index and an FK, but it must not rewrite or remove
// any live data or existing schema object.
assert.doesNotMatch(migration, /\bDROP\b/i, `${migrationName} must not contain DROP`);
assert.doesNotMatch(migration, /\bALTER\s+COLUMN\b/i, `${migrationName} must not alter an existing column`);
assert.doesNotMatch(migration, /\bRENAME\b/i, `${migrationName} must not rename an existing object`);
assert.doesNotMatch(migration, /\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+"|\bINSERT\s+INTO\b/i, `${migrationName} must not rewrite production rows`);

console.log("limited preorder additive schema migration contract tests: PASS");
