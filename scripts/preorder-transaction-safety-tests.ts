import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ProjectOrderStatus } from "@prisma/client";
import { canTransitionFulfillmentStatus, canTransitionOrderStatus, canTransitionPaymentStatus } from "@/lib/projects/rules";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260816190000_add_preorder_order_safety/migration.sql", "utf8");
const service = readFileSync("src/lib/projects/preorder-service.ts", "utf8");
const route = readFileSync("src/app/api/projects/[id]/preorders/route.ts", "utf8");
const panel = readFileSync("src/components/projects/LimitedPreorderPanel.tsx", "utf8");
const actions = readFileSync("src/lib/projects/actions.ts", "utf8");

assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
assert.match(schema, /productSnapshot\s+Json\?/);
assert.match(schema, /skuSnapshot\s+Json\?/);
assert.match(schema, /preorderDeadlineSnapshot\s+DateTime\?/);
assert.match(migration, /ProjectOrder_idempotencyKey_key/);
assert.match(service, /TransactionIsolationLevel\.Serializable/);
assert.match(service, /ACTIVE_RESERVATION_STATUSES/);
assert.match(service, /CAPACITY_EXCEEDED/);
assert.match(service, /commerceStateEvent\.create/);
assert.match(service, /commerceIdempotencyRecord\.(create|update)/);
assert.doesNotMatch(route, /orderId:\s*"pending"/);
assert.match(route, /Idempotency-Key/);
assert.match(panel, /crypto\.randomUUID\(\)/);

assert.equal(canTransitionOrderStatus(ProjectOrderStatus.RESERVATION, ProjectOrderStatus.CONFIRMED), true);
assert.equal(canTransitionOrderStatus(ProjectOrderStatus.RESERVATION, ProjectOrderStatus.COMPLETED), false);
assert.equal(canTransitionOrderStatus(ProjectOrderStatus.SHIPPED, ProjectOrderStatus.COMPLETED), true);
assert.equal(canTransitionOrderStatus(ProjectOrderStatus.COMPLETED, ProjectOrderStatus.CANCELLED), false);
assert.equal(canTransitionPaymentStatus("PAID", "UNPAID"), false);
assert.equal(canTransitionPaymentStatus("PAID", "REFUNDED"), true);
assert.equal(canTransitionFulfillmentStatus("NOT_STARTED", "SHIPPED"), false);
assert.equal(canTransitionFulfillmentStatus("READY_TO_SHIP", "SHIPPED"), true);
assert.match(actions, /canTransitionOrderStatus/);
assert.match(actions, /commerceStateEvent\.create/);

console.log("preorder transaction safety tests: PASS");
