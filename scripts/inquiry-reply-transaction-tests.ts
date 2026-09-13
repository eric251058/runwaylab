import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
let user: any = null;
let row: any;
let replies: any[] = [];
let conflict = false;
let failInsert = false;
let notifications = 0;
const prisma = {
  cooperationRequest: { findUnique: async () => ({ ...row }) },
  async $transaction(run: any) {
    const before = { ...row };
    try { return await run({
      cooperationRequest: { updateMany: async ({ where, data }: any) => {
        assert.deepEqual([...where.status.notIn], ["CLOSED", "COMPLETED"]);
        assert.equal(where.updatedAt, row.updatedAt);
        if (conflict) return { count: 0 };
        Object.assign(row, data); return { count: 1 };
      } },
      cooperationRequestReply: { create: async ({ data }: any) => {
        if (failInsert) throw new Error("insert failed");
        replies.push(data); return { ...data, id: "reply-1" };
      } }
    }); } catch (e) { row = before; throw e; }
  }
};
const dependencies: Record<string, unknown> = {
  "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
  "next/cache": { revalidatePath: () => {} },
  "@prisma/client": { RequestStatus: { CLOSED: "CLOSED", COMPLETED: "COMPLETED", QUOTED: "QUOTED", EVALUATED: "EVALUATED" } },
  "@/lib/auth/session": { getCurrentUser: async () => user },
  "@/lib/fabric-recommendations": { createNotificationSafe: async () => { notifications++; } },
  "@/lib/notifications": { NOTIFICATION_EVENTS: { INQUIRY_REPLIED: "INQUIRY_REPLIED" } },
  "@/lib/provider-experience": { cleanReplyContent: (v: any) => typeof v === "string" ? v.trim() : "" },
  "@/lib/prisma": { prisma },
  "@/lib/supply-network": { providerBelongsToUser: (p: any, u: any) => p.ownerId === u.id }
};
const exports: any = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/app/api/cooperation-requests/[id]/replies/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
 { exports, require: (k: string) => { assert.ok(k in dependencies); return dependencies[k]; }, Date, Error });
const request = () => new Request("https://fashionstyleai.com/api/cooperation-requests/one/replies", { method: "POST", body: JSON.stringify({ content: "可以打样，确认数量后提供报价。" }) });
const context = { params: Promise.resolve({ id: "one" }) };
async function main() {
 row = { id: "one", userId: "buyer", status: "PENDING", updatedAt: "revision-1", provider: { ownerId: "supplier", name: "supplier" }, user: { nickname: "buyer" } };
 assert.equal((await exports.POST(request(), context)).status, 401);
 user = { id: "intruder" }; assert.equal((await exports.POST(request(), context)).status, 404);
 user = { id: "supplier" }; conflict = true;
 assert.equal((await exports.POST(request(), context)).status, 409); assert.equal(replies.length, 0); assert.equal(notifications, 0);
 conflict = false; failInsert = true;
 assert.equal((await exports.POST(request(), context)).status, 503); assert.equal(row.status, "PENDING"); assert.equal(notifications, 0);
 failInsert = false;
 assert.equal((await exports.POST(request(), context)).status, 201); assert.equal(row.status, "QUOTED"); assert.equal(replies.length, 1); assert.equal(notifications, 1);
 row.status = "CLOSED"; assert.equal((await exports.POST(request(), context)).status, 409); assert.equal(replies.length, 1);
 console.log("inquiry reply transaction handler tests passed (mock database)");
}
main().catch(e => { console.error(e); process.exit(1); });
