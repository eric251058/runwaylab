import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePage = readFileSync("src/app/page.tsx", "utf8");
const homeFeed = readFileSync("src/components/works/HomeFeed.tsx", "utf8");
const commentsRoute = readFileSync("src/app/api/works/[id]/comments/route.ts", "utf8");
const previewFunction = homePage.slice(homePage.indexOf("async function getHomeCommentPreviews"), homePage.indexOf("type HomePageProps"));

assert.match(homePage, /getHomeCommentPreviews/, "home page should batch-load comment previews");
assert.match(homePage, /activeFeedMode === "activity" \? await getHomeCommentPreviews/, "comments should only load for activity mode");
assert.match(homePage, /workId:\s*\{\s*in:\s*workIds\s*\}/, "comment previews should avoid one request per card");
assert.match(homePage, /take:\s*workIds\.length \* 6/, "comment preview query should only load the current page subset");
assert.match(homePage, /select:[\s\S]*nickname: true/, "comment preview DTO should select only public author name");
assert.doesNotMatch(previewFunction, /email|phone|passwordHash|session|contactEmail/i, "comment preview DTO must not include private fields");
assert.match(homeFeed, /preview\.slice\(0,\s*2\)/, "activity card should show at most two comments");
assert.match(homeFeed, /查看全部 \{work\.commentCount\} 条评论/, "activity card should show full comment count");
assert.match(homeFeed, /还没有评论，说说你最喜欢的细节。/, "empty comment state should be calm and specific");
assert.match(homeFeed, /truncateShareText\(comment\.content,\s*80\)/, "comment preview should use a safe truncated summary");
assert.match(homeFeed, /说说你最喜欢的细节……/, "activity card should expose a lightweight quick comment entry");
assert.match(homeFeed, /\/login\?next=.*view=activity#work-/, "guest comment action should return to the current feed item");
assert.match(homeFeed, /disabled=\{busy === `\$\{work\.id\}:comment`\}/, "comment submit should block duplicate clicks while loading");
assert.match(homeFeed, /评论内容不能为空。/, "empty comments should be rejected in the client");
assert.match(commentsRoute, /publicWorkWhere/, "server should re-check public work status before accepting comments");
assert.match(commentsRoute, /content:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.max\(500\)/, "quick comment should reuse the existing comment length validation");

console.log("feed comment preview tests passed");
