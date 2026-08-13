"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true); setMessage("");
    const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.get("name"), description: formData.get("description"), visibility: formData.get("visibility") }) });
    const result = await response.json(); setPending(false);
    if (!response.ok) return setMessage(result.message || "创建失败，请稍后再试。");
    router.push(result.href); router.refresh();
  }
  return <form action={submit} className="grid gap-4 rounded-[24px] border border-black/8 bg-white p-6 shadow-sm">
    <div><h2 className="text-xl font-semibold text-ink">创建你的协作空间</h2><p className="mt-1 text-sm text-ink/55">承载作品、项目、合作伙伴与预售验证。</p></div>
    <input name="name" required minLength={2} maxLength={60} placeholder="例如：Eric 独立品牌实验室" className="h-12 rounded-xl border border-black/10 px-4 outline-none focus:border-black/35" />
    <textarea name="description" maxLength={300} placeholder="用一句话说明你想创造什么（可选）" className="min-h-24 rounded-xl border border-black/10 p-4 outline-none focus:border-black/35" />
    <select name="visibility" defaultValue="PUBLIC" className="h-12 rounded-xl border border-black/10 px-4"><option value="PUBLIC">公开 — 所有人可发现</option><option value="UNLISTED">不列出 — 通过链接访问</option><option value="PRIVATE">私密 — 仅成员可见</option></select>
    {message ? <p className="text-sm text-red-600">{message}</p> : null}
    <button disabled={pending} className="h-12 rounded-full bg-ink px-6 font-semibold text-white disabled:opacity-50">{pending ? "正在创建…" : "创建空间"}</button>
  </form>;
}
