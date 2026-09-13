import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
let user: any = { id: "buyer" };
let rows: any[] = [];
let sent = 0, limits = 0;
let race = false;
const prisma = {
 provider: { findFirst: async () => ({ id: "provider", ownerId: "owner", publicContactEnabled: true }) },
 cooperationRequest: {
  findUnique: async ({ where }: any) => rows.find(r => r.userId === where.userId_clientId.userId && r.clientId === where.userId_clientId.clientId) ?? null,
  count: async () => 0,
  create: async ({ data }: any) => {
   const item = { ...data, id: `row-${rows.length}`, createdAt: new Date() };
   if (data.clientId && rows.some(r => r.userId === data.userId && r.clientId === data.clientId)) throw { code: "P2002" };
   rows.push(item);
   if (race) { race = false; throw { code: "P2002" }; } // competing request committed before unique check
   return item;
  }
 }
};
const deps: Record<string, any> = {
 "node:crypto": crypto, zod: { z },
 "@prisma/client": { CooperationType: { OPEN_COOP: "OPEN_COOP" }, ProviderInquiryType: {}, RequestStatus: { PENDING: "PENDING" } },
 "next/server": { NextResponse: { json: (b: unknown, i?: ResponseInit) => Response.json(b, i) } },
 "@/lib/auth/session": { getCurrentUser: async () => user },
 "@/lib/fabric-recommendations": { createNotificationSafe: async () => { sent++; } },
 "@/lib/notifications": { NOTIFICATION_EVENTS: { INQUIRY_RECEIVED: "inquiry" } },
 "@/lib/provider-experience": { inquiryTypeFromInput: () => "GENERAL" },
 "@/lib/prisma": { prisma },
 "@/lib/security/api-response": { tooManyRequests: () => Response.json({}, { status: 429 }) },
 "@/lib/security/rate-limit": { checkRateLimit: () => { limits++; return { limited: false }; } },
 "@/lib/supply-network": { providerBelongsToUser: (p: any, u: any) => p.ownerId === u.id, publicProviderWhere: () => ({}) },
 "@/lib/works/public": {}
};
const exports: any = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/app/api/cooperation-requests/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (k: string) => { assert.ok(k in deps, k); return deps[k]; }, Date, Error });
const key = "b9a08b40-576d-4339-9eb7-19511613fa07";
const req = (extra = {}) => new Request("https://fashionstyleai.com/api/cooperation-requests", { method: "POST", body: JSON.stringify({ clientId: key, providerId: "provider", message: "sample please", ...extra }) });
async function main() {
 assert.equal((await exports.POST(req())).status, 201);
 assert.equal((await exports.POST(req())).status, 200);
 assert.equal(rows.length, 1); assert.equal(sent, 1); assert.equal(limits, 1);
 assert.equal((await exports.POST(req({ message: "changed" }))).status, 409);
 user = { id: "other" }; assert.equal((await exports.POST(req())).status, 201); assert.equal(rows.length, 2);
 user = null; assert.equal((await exports.POST(req())).status, 401);
 user = { id: "racer" }; race = true;
 assert.equal((await exports.POST(req())).status, 200); assert.equal(rows.length, 3); assert.equal(sent, 2);
 assert.equal((await exports.POST(req({ clientId: "bad" }))).status, 422);
 console.log("inquiry idempotency handler tests passed (mock database)");
}
main().catch(e => { console.error(e); process.exit(1); });
