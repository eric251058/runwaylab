import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { supportInput, supportReply } from "../src/lib/support";

let user: { id: string; status: string } | null = null;
let admin: { id: string } | null = null;
let fail = false;
let limited = false;
const rows = new Map<string, any>();
const prisma = { supportRequest: {
  async upsert(args: any) {
    if (fail) throw new Error("database unavailable");
    const key = args.create.requesterId + ":" + args.create.clientId;
    if (!rows.has(key)) rows.set(key, { ...args.create, id: `request-${rows.size}`, status: "PENDING", version: 0 });
    return rows.get(key);
  },
  async updateMany(args: any) {
    if (fail) throw new Error("database unavailable");
    const row = [...rows.values()].find(r => r.id === args.where.id && r.status === args.where.status && r.version === args.where.version);
    if (!row) return { count: 0 };
    Object.assign(row, { ...args.data, version: row.version + 1 });
    return { count: 1 };
  }
} };
function route(path: string) {
  const exports = {};
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/auth/session": { getCurrentUser: async () => user },
    "@/lib/auth/guards": { requireAdminUser: async () => admin },
    "@/lib/prisma": { prisma },
    "@/lib/support": { supportInput, supportReply },
    "@/lib/security/rate-limit": { checkRateLimit: () => ({ limited, retryAfter: 30 }) }
  };
  const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { exports, require: (key: string) => { assert.ok(key in dependencies); return dependencies[key]; }, URL, Date });
  return exports as any;
}
const post = route("src/app/api/support/route.ts").POST;
const patch = route("src/app/api/admin/support/[id]/route.ts").PATCH;
const input = { clientId: "a89dfbe0-31ca-45ca-b9bf-a86a84efdf63", category: "DELETION", message: "请删除我之前上传的个人资料和说明。" };
function request(body: unknown, origin = "https://fashionstyleai.com") {
  return new Request("https://fashionstyleai.com/api/support", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
}
async function main() {
  assert.equal((await post(request(input))).status, 401);
  user = { id: "alice", status: "ACTIVE" };
  assert.equal((await post(request(input, "https://evil.example"))).status, 403);
  assert.equal((await post(request({ ...input, requesterId: "bob" }))).status, 400);
  assert.equal((await post(request({ ...input, message: "short" }))).status, 400);
  const first = await (await post(request(input))).json();
  const repeat = await (await post(request(input))).json();
  assert.equal(first.id, repeat.id); assert.equal(rows.size, 1);
  assert.equal((await post(request({ ...input, message: "这次是不同的内容，不应覆盖之前的申请。" }))).status, 409);
  assert.equal([...rows.values()][0].status, "PENDING", "deletion request must not delete data");
  user = { id: "bob", status: "ACTIVE" };
  const second = await (await post(request(input))).json();
  assert.notEqual(first.id, second.id, "idempotency keys must be scoped to requester");
  const context = { params: Promise.resolve({ id: first.id }) };
  assert.equal((await patch(request({ version: 0, reply: "已核实申请，处理结果如下。" }), context)).status, 403);
  admin = { id: "admin" };
  assert.equal((await patch(request({ version: 0, reply: "已核实申请，处理结果如下。" }), context)).status, 200);
  assert.equal((await patch(request({ version: 0, reply: "第二位管理员的过期回复。" }), context)).status, 409);
  assert.equal([...rows.values()][0].handledById, "admin");
  limited = true; assert.equal((await post(request(input))).status, 429); limited = false;
  fail = true; assert.equal((await post(request(input))).status, 503);
  assert.equal((await patch(request({ version: 0, reply: "测试保存失败时的处理。" }), context)).status, 503);
  console.log("support request handler tests passed (mock database; live migration still required)");
}
main().catch(error => { console.error(error); process.exit(1); });
