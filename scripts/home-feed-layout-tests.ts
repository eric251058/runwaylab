import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePage = readFileSync("src/app/page.tsx", "utf8");
const homeFeed = readFileSync("src/components/works/HomeFeed.tsx", "utf8");

assert.match(homePage, /view=inspiration/, "home page should expose inspiration mode");
assert.match(homePage, /view=activity/, "home page should expose activity mode");
assert.match(homePage, /return isLoggedIn \? "activity" : "inspiration"/, "home page should default guests to inspiration and logged-in users to activity");
assert.match(homeFeed, /mode === "inspiration"/, "home feed should render inspiration mode separately");
assert.match(homeFeed, /return \(\s*<div className="mx-auto max-w-\[700px\] space-y-5">/, "home feed should render activity mode as a separate single column");
assert.match(homeFeed, /grid grid-cols-2/, "inspiration mode should use a two-column mobile grid");
assert.match(homeFeed, /md:grid-cols-3[\s\S]*xl:grid-cols-4/, "desktop inspiration mode should add columns without stretching cards");
assert.match(homeFeed, /max-w-\[700px\]/, "activity mode should remain a centered single column");
assert.match(homeFeed, /aspect-\[3\/4\]/, "inspiration images should avoid a flat horizontal crop");
assert.match(homeFeed, /aspect-\[4\/5\]/, "activity images should avoid a flat horizontal crop");
assert.match(homeFeed, /sizes="\(max-width: 640px\) 48vw/, "mobile image sizes should avoid loading oversized desktop images");
assert.doesNotMatch(homeFeed, /overflow-x|w-\[100vw\]|min-w-screen/, "home feed should not introduce horizontal scrolling");

console.log("home feed layout tests passed");
