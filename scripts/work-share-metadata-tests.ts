import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workPage = readFileSync("src/app/works/[id]/page.tsx", "utf8");
const shareData = readFileSync("src/lib/work-share-data.ts", "utf8");
const shareUtils = readFileSync("src/lib/work-share.ts", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

assert.match(layout, /openGraph[\s\S]*title:\s*"RunwayLab/, "audit: global OG currently uses site-level RunwayLab metadata");
assert.match(workPage, /export async function generateMetadata/, "work detail should define dynamic metadata");
assert.match(workPage, /workShareTitle\(shareInfo\)/, "metadata title should include work title and designer");
assert.match(workPage, /workShareDescription\(shareInfo\)/, "metadata description should use safe public work info");
assert.match(workPage, /alternates:\s*\{\s*canonical:\s*url\s*\}/, "metadata should set canonical URL");
assert.match(workPage, /\/works\/\$\{encodeURIComponent\(shareInfo\.id\)\}\/opengraph-image/, "metadata OG image should belong to the current work");
assert.match(workPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/, "non-public or missing works should noindex");
assert.match(shareData, /publicQualityWorkWhere/, "metadata query should only use public work data");
assert.match(shareData, /isPublicQualityWork/, "metadata query should reject draft, pending, rejected or offline works");
assert.doesNotMatch(shareData, /email|phone|passwordHash|contactEmail/i, "metadata DTO should not select private contact fields");
assert.match(shareUtils, /stripContactInfo/, "metadata text should strip contact information");
assert.match(shareUtils, /workCanonicalUrl[\s\S]*fashionstyleai\.com|SITE_URL/, "canonical should use the production site URL");

console.log("work share metadata tests passed");
