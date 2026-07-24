import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const confirmButtonSource = readFileSync("src/components/lifecycle/LifecycleActionButton.tsx", "utf8");
const myWorksSource = readFileSync("src/components/me/MyWorksList.tsx", "utf8");
const fabricPageSource = readFileSync("src/app/provider-center/fabrics/page.tsx", "utf8");
const showcasePageSource = readFileSync("src/app/provider-center/showcase/page.tsx", "utf8");
const providerInquirySource = readFileSync("src/app/provider-center/inquiries/page.tsx", "utf8");
const meInquirySource = readFileSync("src/app/me/inquiries/page.tsx", "utf8");

assert.match(confirmButtonSource, /<dialog/, "dangerous actions should use a lightweight confirmation dialog");
assert.match(confirmButtonSource, /description/, "confirmation should include target or object description");
assert.match(confirmButtonSource, /consequence/, "confirmation should include operation consequence");
assert.match(confirmButtonSource, /disabledReason/, "disabled actions should expose a reason");
assert.doesNotMatch(myWorksSource, /window\.confirm|alert\(/, "my works should not use native confirm or alert");
assert.match(myWorksSource, /isSubmitting/, "my works action should block duplicate clicks while loading");
assert.match(myWorksSource, /删除草稿/, "hard delete copy should be precise");
assert.match(myWorksSource, /下架作品/, "offline copy should not be styled as hard delete");
assert.match(fabricPageSource, /下架面料/, "fabric offline action should be explicit");
assert.match(fabricPageSource, /删除草稿/, "fabric hard delete copy should be precise");
assert.match(showcasePageSource, /下架案例/, "showcase offline action should be explicit");
assert.match(providerInquirySource, /关闭询盘/, "inquiry close action should be explicit");
assert.match(meInquirySource, /撤回询盘/, "designer withdraw action should be explicit");

console.log("destructive action UI tests passed");
