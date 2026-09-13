import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL ?? "http://missing");
if (process.env.CI !== "true" || url.hostname !== "127.0.0.1" || url.pathname !== "/runwaylab_acceptance") throw Error("Only the disposable CI database is allowed");
const db = new PrismaClient();
async function main() {
 const user = await db.user.create({ data: { email: "buyer@acceptance.invalid", nickname: "CI buyer", passwordHash: "not-a-login-password" } });
 const other = await db.user.create({ data: { email: "other@acceptance.invalid", nickname: "CI other", passwordHash: "not-a-login-password" } });
 const data = { userId: user.id, type: "OPEN_COOP" as const, contact: "site only", clientId: crypto.randomUUID(), requestHash: "same" };
 const inserts = await Promise.allSettled(Array.from({ length: 8 }, () => db.cooperationRequest.create({ data })));
 assert.equal(inserts.filter(r => r.status === "fulfilled").length, 1);
 for (const result of inserts) if (result.status === "rejected") assert.equal(result.reason.code, "P2002");
 assert.equal(await db.cooperationRequest.count({ where: { userId: user.id, clientId: data.clientId } }), 1);
 await db.cooperationRequest.create({ data: { ...data, userId: other.id } });
 await db.cooperationRequest.create({ data: { ...data, clientId: null } });
 await db.cooperationRequest.create({ data: { ...data, clientId: null } });
 const inquiry = await db.cooperationRequest.findUniqueOrThrow({ where: { userId_clientId: { userId: user.id, clientId: data.clientId } } });
 await assert.rejects(db.$transaction(async tx => {
  await tx.cooperationRequest.update({ where: { id: inquiry.id }, data: { status: "CLOSED" } });
  await tx.cooperationRequestReply.create({ data: { inquiryId: inquiry.id, senderId: "missing", senderRole: "DESIGNER", content: "must fail" } });
 }));
 assert.equal((await db.cooperationRequest.findUniqueOrThrow({ where: { id: inquiry.id } })).status, "PENDING");
 const replyKey = crypto.randomUUID();
 const replies = await Promise.allSettled(Array.from({ length: 6 }, () => db.$transaction(async tx => {
  const changed = await tx.cooperationRequest.updateMany({ where: { id: inquiry.id, updatedAt: inquiry.updatedAt, status: { notIn: ["CLOSED", "COMPLETED"] } }, data: { status: "CLOSED" } });
  if (changed.count !== 1) throw Error("CONFLICT");
  return tx.cooperationRequestReply.create({ data: { inquiryId: inquiry.id, senderId: user.id, senderRole: "DESIGNER", content: "close", clientId: replyKey, requestHash: "same" } });
 })));
 assert.equal(replies.filter(r => r.status === "fulfilled").length, 1);
 assert.equal(await db.cooperationRequestReply.count({ where: { inquiryId: inquiry.id } }), 1);
 assert.equal((await db.cooperationRequest.findUniqueOrThrow({ where: { id: inquiry.id } })).status, "CLOSED");
 const support = await db.supportRequest.create({ data: { requesterId: user.id, clientId: crypto.randomUUID(), category: "FEEDBACK", message: "CI support request" } });
 const resolutions = await Promise.all(Array.from({ length: 4 }, () => db.supportRequest.updateMany({ where: { id: support.id, status: "PENDING", version: 0 }, data: { status: "RESOLVED", version: { increment: 1 }, reply: "Handled in CI" } })));
 assert.equal(resolutions.reduce((sum, r) => sum + r.count, 0), 1);
 assert.equal(await db.supportRequest.count({ where: { id: support.id, requesterId: other.id } }), 0);
 console.log("PostgreSQL migrations, unique constraints, concurrent closure, support version guards and transaction rollback passed");
}
main().finally(() => db.$disconnect()).catch(e => { console.error(e); process.exitCode = 1; });
