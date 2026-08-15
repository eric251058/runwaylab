import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260813170000_add_transaction_data_layer/migration.sql"),
  "utf8",
);

for (const model of [
  "CommercePaymentAttempt",
  "CommerceRefund",
  "CommerceIdempotencyRecord",
  "CommerceStateEvent",
]) {
  assert.match(schema, new RegExp("model " + model + " \\{"));
  assert.match(migration, new RegExp('CREATE TABLE "' + model + '"'));
}

assert.match(schema, /paymentAttempts\s+CommercePaymentAttempt\[\]/);
assert.match(schema, /refunds\s+CommerceRefund\[\]/);
assert.match(schema, /idempotencyKey\s+String\s+@unique/);
assert.match(schema, /@@unique\(\[scope, key\]\)/);
assert.match(schema, /@@unique\(\[aggregateType, aggregateId, idempotencyKey\]\)/);
assert.match(migration, /REFERENCES "ProjectOrder"\("id"\) ON DELETE CASCADE/);
assert.match(migration, /REFERENCES "CommercePaymentAttempt"\("id"\) ON DELETE SET NULL/);
assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);

console.log("transaction-data-layer-tests: PASS");
