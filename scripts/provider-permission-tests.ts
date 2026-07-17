import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboardingRoute = readFileSync("src/app/api/provider/onboarding/route.ts", "utf8");
const inquiryRoute = readFileSync("src/app/api/cooperation-requests/route.ts", "utf8");
const repliesRoute = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");
const contactRoute = readFileSync("src/app/api/cooperation-requests/[id]/contact/route.ts", "utf8");
const authNav = readFileSync("src/components/layout/AuthNav.tsx", "utf8");
const mePage = readFileSync("src/app/me/page.tsx", "utf8");
const profileRoute = readFileSync("src/app/api/me/profile/route.ts", "utf8");

assert.match(onboardingRoute, /getCurrentUser/, "provider onboarding must require login");
assert.match(onboardingRoute, /ownerId: user\.id/, "provider onboarding must bind provider to current user");
assert.doesNotMatch(onboardingRoute, /password|SESSION_SECRET|COOKIE_SECURE/, "provider onboarding must not alter login/session secrets");
assert.match(inquiryRoute, /providerBelongsToUser/, "inquiry route must prevent messaging own provider");
assert.match(inquiryRoute, /userId: user\.id/, "inquiry route must bind requester to current user");
assert.match(repliesRoute, /inquiry\.userId === user\.id/, "reply route must authorize designer side");
assert.match(repliesRoute, /providerBelongsToUser/, "reply route must authorize provider side");
assert.match(contactRoute, /inquiry\.userId !== user\.id/, "contact authorization can only be changed by inquiry owner");
assert.match(authNav, /hasProvider/, "navigation should use real provider binding");
assert.match(mePage, /ownerId: user\.id/, "provider-owned accounts should default to provider center");
assert.match(profileRoute, /designerProfile\.upsert/, "designer profile editing should remain available to non-provider users");
assert.match(profileRoute, /isProvider/, "provider account profile should hide designer-only fields");

console.log("provider permission tests passed");
