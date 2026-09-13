import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const values = new Map<string,string>();
let broken = false;
const storage = { getItem: (key: string) => { if (broken) throw Error(); return values.get(key); }, setItem: (k: string,v: string) => { if (broken) throw Error(); values.set(k,v); } };
function load() {
 const exports: any = {};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/inquiry-submission.ts","utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, crypto: webcrypto, TextEncoder, Uint8Array, sessionStorage: storage });
 return exports.inquirySubmissionId;
}
async function main() {
 const first = load();
 const a = await first("provider:1", "private message");
 assert.equal(await load()("provider:1", "private message"), a);
 assert.notEqual(await first("provider:2", "private message"), a);
 assert.notEqual(await first("provider:1", "changed message"), a);
 assert.ok(!JSON.stringify([...values]).includes("private message"));
 broken = true;
 const fallback = await first("reply:1", "reply");
 assert.equal(await first("reply:1", "reply"), fallback);
 console.log("inquiry storage refresh, scoping and storage-failure tests passed");
}
main().catch(e => { console.error(e); process.exit(1); });
