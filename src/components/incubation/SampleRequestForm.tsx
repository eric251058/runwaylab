"use client";

import { useState } from "react";

type WorkOption = {
  id: string;
  title: string;
};

type SampleRequestFormProps = {
  works: WorkOption[];
  initialWorkId?: string;
  defaultContact: string;
};

export function SampleRequestForm({ works, initialWorkId = "", defaultContact }: SampleRequestFormProps) {
  const [form, setForm] = useState({
    workId: initialWorkId,
    garmentCategory: "",
    hasPattern: false,
    hasFabric: false,
    needsFabricHelp: true,
    budgetRange: "",
    quantity: "",
    expectedDate: "",
    considerSmallBatch: false,
    contact: defaultContact,
    remark: ""
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.contact.trim()) {
      setMessage("请填写联系方式。");
      return;
    }

    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/sample-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        quantity: form.quantity ? Number(form.quantity) : null
      })
    });
    const data = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data?.message ?? "提交失败，请稍后再试。");
      return;
    }

    setSuccess(true);
    setMessage("打样申请已提交，你可以在我的页面查看处理状态。");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Sample Request</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-5xl">把你的设计做成第一件样衣。</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">提交后平台会在后台记录状态，先完成打样需求闭环。</p>
      </header>

      <section className="space-y-5 rounded-[6px] bg-white p-5 shadow-[0_18px_60px_rgba(16,16,16,0.08)] md:p-7">
        <label className="block">
          <span className="text-xs font-semibold text-ink/45">选择作品</span>
          <select
            value={form.workId}
            onChange={(event) => setForm({ ...form, workId: event.target.value })}
            className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none"
          >
            <option value="">暂不关联作品</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">成衣品类</span>
            <input value={form.garmentCategory} onChange={(event) => setForm({ ...form, garmentCategory: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">预算范围</span>
            <input value={form.budgetRange} onChange={(event) => setForm({ ...form, budgetRange: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">预计数量</span>
            <input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">期望完成时间</span>
            <input type="date" value={form.expectedDate} onChange={(event) => setForm({ ...form, expectedDate: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["hasPattern", "已有纸样"],
            ["hasFabric", "已有面料"],
            ["needsFabricHelp", "需要平台推荐面料"],
            ["considerSmallBatch", "考虑小批量生产"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-[6px] bg-paper p-4 text-sm font-semibold">
              <input
                type="checkbox"
                checked={Boolean(form[key as keyof typeof form])}
                onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-ink/45">联系方式</span>
          <input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink/45">备注</span>
          <textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} className="mt-2 min-h-28 w-full rounded-[6px] border border-black/10 bg-paper p-4 text-sm outline-none" />
        </label>

        {message ? <p className={`rounded-[6px] px-4 py-3 text-sm ${success ? "bg-lime-50 text-lime-800" : "bg-red-50 text-red-700"}`}>{message}</p> : null}

        <button type="button" disabled={submitting || success} onClick={submit} className="h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? "提交中..." : success ? "已提交" : "提交打样申请"}
        </button>
      </section>
    </div>
  );
}
