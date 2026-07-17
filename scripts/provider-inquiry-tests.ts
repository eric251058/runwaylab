import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inquiryTypeFromInput, PROVIDER_INQUIRY_TYPE_COPY } from "../src/lib/provider-experience";

assert.equal(inquiryTypeFromInput("FABRIC_SAMPLE"), "FABRIC_SAMPLE");
assert.equal(inquiryTypeFromInput("ACCESSORY"), "ACCESSORY");
assert.equal(inquiryTypeFromInput("PROCESS"), "PROCESS");
assert.equal(inquiryTypeFromInput("UNKNOWN"), "GENERAL");
assert.equal(PROVIDER_INQUIRY_TYPE_COPY.ACCESSORY, "辅料");
assert.equal(PROVIDER_INQUIRY_TYPE_COPY.PROCESS, "工艺");

const inquiryFormSource = readFileSync("src/components/providers/ProviderInquiryForm.tsx", "utf8");
const routeSource = readFileSync("src/app/api/cooperation-requests/route.ts", "utf8");
const repliesSource = readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8");
const providerCenterSource = readFileSync("src/app/provider-center/inquiries/page.tsx", "utf8");
const meInquiriesSource = readFileSync("src/app/me/inquiries/page.tsx", "utf8");

assert.match(inquiryFormSource, /联系服务商/, "public provider inquiry form should use contact wording");
assert.match(inquiryFormSource, /SITE_ONLY/, "contact authorization should default to site-only");
assert.doesNotMatch(inquiryFormSource, /required.*phone|required.*email|name="contact"/, "phone/email should not be required");
assert.match(routeSource, /contactPreference.*SITE_ONLY/, "API should default to site-only contact authorization");
assert.match(routeSource, /createNotificationSafe/, "new inquiry should notify provider");
assert.match(repliesSource, /cooperationRequestReply\.create/, "threaded replies should be persisted");
assert.match(repliesSource, /senderRole/, "replies should record sender role");
assert.match(repliesSource, /RequestStatus\.CLOSED/, "closed inquiries should block further replies");
assert.match(providerCenterSource, /InquiryReplyForm/, "provider inquiry center should include reply form");
assert.match(meInquiriesSource, /ContactAuthorizationControl/, "designer inquiries should support contact authorization changes");

console.log("provider inquiry tests passed");
