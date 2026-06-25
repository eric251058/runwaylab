"use client";

import { useState } from "react";

type WorkOption = {
  id: string;
  title: string;
};

type FabricRequestFormProps = {
  works: WorkOption[];
  initialWorkId?: string;
  defaultContact: string;
};

const feelingOptions = ["垂感", "挺括", "轻薄", "厚重", "有光泽", "透明", "弹力", "肌理感"];

export function FabricRequestForm({ works, initialWorkId = "", defaultContact }: FabricRequestFormProps) {
  const [form, setForm] = useState({
    workId: initialWorkId,
    category: "",
    desiredFeeling: [] as string[],
    colorDirection: "",
    budgetRange: "",
    contact: defaultContact,
    remark: ""
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleFeeling = (value: string) => {
    setForm((current) => ({
      ...current,
      desiredFeeling: current.desiredFeeling.includes(value)
        ? current.desiredFeeling.filter((item) => item !== value)
        : [...current.desiredFeeling, value]
    }));
  };

  const submit = async () => {
    if (!form.contact.trim() || form.desiredFeeling.length === 0) {
      setMessage("请填写联系方式，并至少选择一种想要的面料感觉。");
      return;
    }

    setSubmitting(true);
    setMessage("");
    const response = await fetch("/api/fabric-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data?.message ?? "提交失败，请稍后再试。");
      return;
    }

    setSuccess(true);
    setMessage("找面料申请已提交，你可以在我的页面查看处理状态。");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Fabric Request</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-5xl">为你的设计找到合适的面料方向。</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">提交后平台会在后台跟进，第一版先做需求记录和状态流转。</p>
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
            <span className="text-xs font-semibold text-ink/45">服装品类</span>
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">颜色方向</span>
            <input value={form.colorDirection} onChange={(event) => setForm({ ...form, colorDirection: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
          </label>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink/45">想要的感觉</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {feelingOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleFeeling(item)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                  form.desiredFeeling.includes(item) ? "border-ink bg-ink text-white" : "border-black/10 bg-paper text-ink/55"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-ink/45">预算范围</span>
          <input value={form.budgetRange} onChange={(event) => setForm({ ...form, budgetRange: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none" />
        </label>
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
          {submitting ? "提交中..." : success ? "已提交" : "提交找面料申请"}
        </button>
      </section>
    </div>
  );
}
