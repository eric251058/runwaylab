import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sharePanel = readFileSync("src/components/works/WorkSharePanel.tsx", "utf8");
const shareUtils = readFileSync("src/lib/work-share.ts", "utf8");
const ogImage = readFileSync("src/app/works/[id]/opengraph-image.tsx", "utf8");
const quickActions = readFileSync("src/components/works/WorkQuickActions.tsx", "utf8");

assert.match(ogImage, /ImageResponse/, "work detail should generate a dedicated Open Graph image");
assert.match(ogImage, /width:\s*1200[\s\S]*height:\s*630/, "Open Graph image should be 1200x630");
assert.match(ogImage, /getPublicWorkShareInfo/, "Open Graph image should use the current public work");
assert.match(ogImage, /safeWorkImageUrl/, "Open Graph image should sanitize the cover image URL");
assert.match(ogImage, /method:\s*"HEAD"/, "Open Graph image should verify that the cover still exists");
assert.match(ogImage, /responseType\.startsWith\("image\/"\)/, "Open Graph image should reject non-image responses");
assert.match(ogImage, /width=\{710\}[\s\S]*height=\{630\}/, "Open Graph cover should declare intrinsic dimensions");
assert.equal(
  (ogImage.match(/<div style=\{\{ display: "flex", flexDirection: "column" \}\}>/g) ?? []).length,
  2,
  "Open Graph text groups should use explicit Satori-compatible layout"
);
assert.match(ogImage, /让好设计走向现实/, "Open Graph image should include brand copy without fake awards");
assert.doesNotMatch(ogImage, /评论|获奖|官方认证/, "Open Graph image should not include comments or fake certification");

assert.match(sharePanel, /分享这个设计/, "share panel should replace the single system share button");
assert.match(sharePanel, /分享作品/, "share panel should include system share");
assert.match(sharePanel, /生成小红书分享图/, "share panel should include Xiaohongshu poster generation");
assert.match(sharePanel, /复制分享文案/, "share panel should allow copy editing text");
assert.match(sharePanel, /复制作品链接/, "share panel should allow copying the canonical link");
assert.match(sharePanel, /canvas\.width = 1080[\s\S]*canvas\.height = 1440/, "Xiaohongshu poster should be 1080x1440");
assert.match(sharePanel, /navigator\.canShare\?\.\(\{ files: \[file\] \}\)/, "file sharing should check navigator.canShare before sharing files");
assert.match(sharePanel, /分享图片已生成，文案已复制。请打开小红书选择图片发布。/, "fallback copy should be honest");
assert.doesNotMatch(sharePanel, /已分享到小红书|发布成功|xhs:|xiaohongshu:|dangerouslySetInnerHTML|alert\(/, "share flow must not fake publication or use unsafe rendering");
assert.match(quickActions, /<WorkSharePanel/, "work card share action should open the custom share panel");
assert.match(shareUtils, /export function systemShareText/, "share helpers should build deterministic system share text");
assert.match(shareUtils, /export function xiaohongshuCopy/, "share helpers should build deterministic Xiaohongshu copy");

console.log("work share poster tests passed");
