import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePage = readFileSync("src/app/page.tsx", "utf8");
const homeFeed = readFileSync("src/components/works/HomeFeed.tsx", "utf8");
const workStatusBadge = readFileSync("src/components/works/WorkStatusBadge.tsx", "utf8");
const adminEditorialApi = readFileSync("src/app/api/admin/editorial/route.ts", "utf8");
const adminEditorialPanel = readFileSync("src/components/admin/AdminEditorialPanel.tsx", "utf8");

assert.doesNotMatch(homeFeed, /编辑推荐/, "homepage work cards should not render the prominent editor pick label");
assert.doesNotMatch(homeFeed, /isEditorPick \? <span/, "homepage work cards should not render editor-pick overlay badges");
assert.match(homeFeed, /aspect-\[3\/4\]/, "inspiration cards should keep their stable portrait image ratio");
assert.match(homeFeed, /aspect-\[4\/5\][\s\S]*sm:aspect-\[3\/4\]/, "activity cards should keep their single-column image structure");
assert.match(homePage, /isEditorPick: "desc"/, "editor picks should still participate in homepage ranking");

assert.match(workStatusBadge, /kind: "editorPick", label: "精选"/, "non-homepage editor-pick badge should use the shorter label");
assert.doesNotMatch(workStatusBadge, /label: "编辑推荐"/, "shared work status badge should not use the prominent editor pick label");
assert.match(workStatusBadge, /editorPick: "border-black\/10 bg-white\/85 text-ink\/55"/, "editor-pick badge should be visually restrained");

assert.match(adminEditorialApi, /"EDITOR_PICK"/, "admin editorial API should still support editor picks");
assert.match(adminEditorialApi, /isEditorPick: enabled/, "admin editorial API should still update editor-pick state");
assert.match(adminEditorialPanel, /\{ type: "EDITOR_PICK", label: "编辑推荐" \}/, "admin editorial controls should still expose editor picks");

console.log("home editor pick label tests passed");
