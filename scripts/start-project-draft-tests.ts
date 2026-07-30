import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const flow = readFileSync("src/components/start/StartProjectFlow.tsx", "utf8");
const validation = readFileSync("src/lib/start-projects/validation.ts", "utf8");

assert.match(flow, /runwaylab\.startProject\.v1/, "draft should use a versioned sessionStorage key");
assert.match(flow, /window\.sessionStorage\.setItem/, "draft should be saved to sessionStorage");
assert.match(flow, /window\.sessionStorage\.getItem/, "draft should be restored from sessionStorage");
assert.match(flow, /window\.sessionStorage\.removeItem/, "draft should be cleared after successful creation or incompatible state");
assert.match(flow, /expiresAt < Date\.now\(\)/, "expired drafts should be discarded safely");
assert.match(flow, /parsed\.version !== 1/, "incompatible draft versions should be discarded safely");
assert.match(flow, /clientDraftId/, "draft should include a stable clientDraftId for idempotency");
assert.match(flow, /router\.push\(`\/login\?next=\$\{encodeURIComponent\("\/start"\)\}`\)/, "unauthenticated creation should return to /start after login");
assert.doesNotMatch(flow, /next=.*ideaText|next=.*imageUrl|searchParams\.set\("ideaText"|searchParams\.set\("imageUrl"/, "long text and image URLs must not be stored in the URL");
assert.match(validation, /normalizeStartSourceParam/, "source parameter sanitization helper should exist");
assert.match(validation, /if \(value === "design"\) return "DESIGN"/, "design source parameter should map safely");
assert.match(validation, /return null/, "invalid source parameters should safely fall back");

console.log("start project draft tests passed");
