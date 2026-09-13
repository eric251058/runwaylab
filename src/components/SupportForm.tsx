"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_LABELS } from "@/lib/support";
export function SupportForm({ id, version = 0 }: { id?: string; version?: number }) {
  const router = useRouter();
  const clientId = useRef("");
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="mt-4 space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    busy.current = true; setPending(true); setMessage("");
    if (!clientId.current) clientId.current = crypto.randomUUID();
    try {
      const response = await fetch(id ? `/api/admin/support/${encodeURIComponent(id)}` : "/api/support", {
        method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { version, reply: data.get("message") } : { clientId: clientId.current, category: data.get("category"), message: data.get("message") })
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.message || "保存失败，请重试。"); return; }
      setMessage(id ? "回复已保存，用户可在申请记录中查看。" : `申请已保存，编号：${result.id}。请在下方查看处理结果。`);
      form.reset(); clientId.current = ""; router.refresh();
    } catch { setMessage("连接失败，内容仍保留在表单中，请重试。"); }
    finally { busy.current = false; setPending(false); }
  }}>
    {!id ? <label className="block">申请类型<select disabled={pending} name="category" className="mt-2 block min-h-11 w-full rounded border p-2">{Object.entries(SUPPORT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label> : null}
    <label className="block">{id ? "处理结果（用户可见）" : "问题说明"}<textarea disabled={pending} name="message" required minLength={id ? 5 : 10} maxLength={2000} rows={4} className="mt-2 block w-full rounded border p-3" placeholder={id ? "说明已完成的处理；未能完成时请说明原因和下一步。" : "请说明涉及的作品或页面，以及希望如何处理。不要填写密码、验证码或证件号码。"} /></label>
    <p role="status" aria-live="polite" className="break-words text-sm">{message}</p>
    <button disabled={pending} className="min-h-11 rounded-full bg-ink px-5 text-white disabled:opacity-50">{pending ? "保存中…" : id ? "回复并标记已处理" : "提交申请"}</button>
  </form>;
}
