import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const flow = readFileSync("src/components/start/StartProjectFlow.tsx", "utf8");
const startPage = readFileSync("src/app/start/page.tsx", "utf8");

assert.match(flow, /max-w-\[680px\]/, "desktop form should remain focused and centered");
assert.match(flow, /px-4/, "mobile layout should keep readable side padding");
assert.match(flow, /min-h-14/, "option cards should have large touch targets");
assert.match(flow, /min-h-12/, "primary button should have a large touch target");
assert.match(flow, /grid gap-3/, "steps should use a simple stacked mobile layout");
assert.match(flow, /w-full/, "textarea and primary action should fit mobile width");
assert.match(flow, /min-h-32/, "text input should be comfortable on mobile");
assert.doesNotMatch(flow, /w-\[100vw\]|min-w-screen|overflow-x/, "start flow should not introduce horizontal page scrolling");
assert.match(startPage, /bg-paper text-ink/, "/start should use existing minimal visual system");
assert.match(flow, /约 60 秒/, "flow should keep the 60-second expectation visible");

console.log("start project mobile UI tests passed");
