import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickActions = readFileSync("src/components/works/WorkQuickActions.tsx", "utf8");
const interactionBar = readFileSync("src/components/works/WorkInteractionBar.tsx", "utf8");
const homeFeed = readFileSync("src/components/works/HomeFeed.tsx", "utf8");
const sharePanel = readFileSync("src/components/works/WorkSharePanel.tsx", "utf8");
const workCard = readFileSync("src/components/works/WorkCard.tsx", "utf8");

for (const source of [quickActions, interactionBar, homeFeed]) {
  assert.match(source, /min-h-\[44px\]|min-h-11/, "interactive buttons should keep at least a 44px tap target");
  assert.match(source, /aria-label/, "icon or compact buttons should have readable names");
  assert.doesNotMatch(source, /alert\(|window\.confirm|router\.push\("\/login"\)/, "ordinary business failures should not use blocking UI or log users out");
}

assert.match(quickActions, /aria-pressed=\{liked\}/, "quick card like state should be explicit");
assert.match(quickActions, /aria-pressed=\{favorited\}/, "quick card favorite state should be explicit");
assert.match(interactionBar, /aria-pressed=\{liked\}/, "detail like state should be explicit");
assert.match(interactionBar, /aria-pressed=\{favorited\}/, "detail favorite state should be explicit");
assert.match(homeFeed, /setShareWork\(work\)/, "activity card share button should open the custom share panel");
assert.match(quickActions, /setShareOpen\(true\)/, "compact card share button should open the custom share panel");
assert.match(interactionBar, /setShareOpen\(true\)/, "detail share button should open the custom share panel");
assert.match(sharePanel, /onKeyDown=\{trapFocus\}/, "share panel should trap focus");
assert.match(sharePanel, /event\.key === "Escape"/, "share panel should support Escape close");
assert.doesNotMatch(sharePanel, /dangerouslySetInnerHTML|javascript:|data:/, "share panel should avoid unsafe rendering or target URLs");
assert.match(workCard, /absolute left-2 top-2|WorkStatusBadge/, "editor pick badge should stay small and near the image edge");

console.log("work card interaction tests passed");
