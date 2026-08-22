"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const SERVICE_OPTIONS = [
  "面料供应",
  "辅料供应",
  "服装打样",
  "小单生产",
  "大货生产",
  "版型设计",
  "印花绣花",
  "其他服务"
] as const;

type Draft = {
  name: string;
  contactName: string;
  phone: string;
  city: string;
  services: string[];
  intro: string;
  acceptRules: boolean;
};

type ApiResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
  application?: { id?: string; companyName?: string; status?: string };
  next?: string;
};

const initialDraft: Draft = {
  name: "",
  contactName: "",
  phone: "",
  city: "",
  services: [],
  intro: "",
  acceptRules: false
};

export function QuickProviderOnboardingForm() {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function toggleService(service: string) {
    update(
      "services",
      draft.services.includes(service)
        ? draft.services.filter((item) => item !== service)
        : [...draft.services, service]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/provider/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setError(
          response.status === 401
            ? "请先登录，再提交入驻意向。已填写的内容会保留在当前页面。"
            : payload.message ?? "暂时无法提交，请检查信息后重试。"
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError("网络暂时不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Application received</p>
        <h3 className="mt-3 text-2xl font-semibold text-ink">入驻意向已提交</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/60">
          平台会核验主体与服务能力。审核通过前不会公开展示，也不会产生任何自动扣费。
        </p>
        <Link
          href="/provider-center"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white"
        >
          查看申请进度
        </Link>
      </div>
    );
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-[10px] border border-black/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-ink";

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-black/10 bg-white p-5 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          企业或团队名称
          <input
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={100}
            className={inputClass}
            placeholder="例如：绍兴某某面料"
          />
          {fieldErrors.name ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.name}</span> : null}
        </label>
        <label className="text-sm font-medium text-ink">
          联系人
          <input
            value={draft.contactName}
            onChange={(event) => update("contactName", event.target.value)}
            maxLength={60}
            className={inputClass}
            placeholder="真实姓名"
          />
          {fieldErrors.contactName ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.contactName}</span> : null}
        </label>
        <label className="text-sm font-medium text-ink">
          手机号
          <input
            value={draft.phone}
            onChange={(event) => update("phone", event.target.value)}
            maxLength={30}
            inputMode="tel"
            className={inputClass}
            placeholder="用于审核联系"
          />
          {fieldErrors.phone ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.phone}</span> : null}
        </label>
        <label className="text-sm font-medium text-ink">
          所在城市
          <input
            value={draft.city}
            onChange={(event) => update("city", event.target.value)}
            maxLength={60}
            className={inputClass}
            placeholder="例如：绍兴柯桥"
          />
          {fieldErrors.city ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.city}</span> : null}
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink">可提供的服务（最多 8 项）</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map((service) => {
            const selected = draft.services.includes(service);
            return (
              <button
                key={service}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleService(service)}
                className={"rounded-full border px-4 py-2 text-sm transition " + (selected ? "border-ink bg-ink text-white" : "border-black/10 bg-paper text-ink/65 hover:border-ink/30")}
              >
                {service}
              </button>
            );
          })}
        </div>
        {fieldErrors.services ? <span className="mt-2 block text-xs text-red-600">{fieldErrors.services}</span> : null}
      </fieldset>

      <label className="mt-6 block text-sm font-medium text-ink">
        一句话介绍（选填）
        <textarea
          value={draft.intro}
          onChange={(event) => update("intro", event.target.value)}
          maxLength={120}
          className="mt-2 min-h-24 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink"
          placeholder="说清核心品类、起订量或交期优势"
        />
        <span className="mt-1 block text-right text-xs text-ink/35">{draft.intro.length}/120</span>
      </label>

      <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-ink/60">
        <input
          type="checkbox"
          checked={draft.acceptRules}
          onChange={(event) => update("acceptRules", event.target.checked)}
          className="mt-1 size-4 accent-black"
        />
        <span>
          我确认信息真实，并同意平台仅在审核、项目匹配和双方明确授权的范围内使用这些资料。
        </span>
      </label>
      {fieldErrors.acceptRules ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.acceptRules}</span> : null}

      {error ? (
        <div className="mt-5 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          {error.startsWith("请先登录") ? (
            <Link href="/login?next=/providers/join" className="ml-2 font-semibold underline underline-offset-4">
              去登录
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? "正在提交…" : "提交入驻意向"}
        </button>
        <Link href="/providers/apply" className="text-center text-sm font-semibold text-ink/55 hover:text-ink">
          已准备完整资料？填写完整申请
        </Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-ink/40">提交不代表审核通过；平台不承诺订单、排名或收益。</p>
    </form>
  );
}
