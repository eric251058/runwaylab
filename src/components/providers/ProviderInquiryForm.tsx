"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CONTACT_AUTH_OPTIONS, PROVIDER_INQUIRY_TYPE_COPY } from "@/lib/provider-experience";

type WorkOption = {
  id: string;
  title: string;
};

type ProviderInquiryFormProps = {
  providerId: string;
  workOptions: WorkOption[];
  loginHref: string;
  isLoggedIn: boolean;
  fabricId?: string;
  showcaseItemId?: string;
  defaultRequestType?: string;
  title?: string;
  description?: string;
  disabledReason?: string;
};

const inquiryTypes = [
  ["FABRIC_SAMPLE", PROVIDER_INQUIRY_TYPE_COPY.FABRIC_SAMPLE],
  ["ACCESSORY", PROVIDER_INQUIRY_TYPE_COPY.ACCESSORY],
  ["SAMPLE_DEVELOPMENT", PROVIDER_INQUIRY_TYPE_COPY.SAMPLE_DEVELOPMENT],
  ["MASS_PRODUCTION", PROVIDER_INQUIRY_TYPE_COPY.MASS_PRODUCTION],
  ["PROCESS", PROVIDER_INQUIRY_TYPE_COPY.PROCESS],
  ["OTHER", PROVIDER_INQUIRY_TYPE_COPY.OTHER]
] as const;

export function ProviderInquiryForm({
  providerId,
  workOptions,
  loginHref,
  isLoggedIn,
  fabricId,
  showcaseItemId,
  defaultRequestType = "FABRIC_SAMPLE",
  title = "联系服务商",
  description = "发送站内询盘，先说明你需要的服务。联系方式默认不公开。",
  disabledReason
}: ProviderInquiryFormProps) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <div className="rounded-[8px] border border-black/8 bg-white p-4">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/55">登录后可以向服务商发送站内询盘。</p>
        <Link href={loginHref} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white sm:w-fit">
          登录后联系服务商
        </Link>
      </div>
    );
  }

  function onSubmit(formData: FormData) {
    setMessage("");
    setSuccess("");
    if (disabledReason) {
      setMessage(disabledReason);
      return;
    }
    const payload = {
      providerId,
      fabricId,
      showcaseItemId,
      workId: formData.get("workId")?.toString() || null,
      requestType: formData.get("requestType")?.toString() || "OTHER",
      expectedDate: formData.get("expectedDate")?.toString() || null,
      contactPreference: formData.get("contactPreference")?.toString() || "SITE_ONLY",
      message: formData.get("message")?.toString() || ""
    };

    startTransition(async () => {
      const response = await fetch("/api/cooperation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.message || "发送失败，请稍后再试。");
        return;
      }
      setSuccess(result?.message || "已发送。服务商回复后，我们会通知你。");
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink/55">{description}</p>
      </div>
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      {success ? <p className="rounded-[6px] bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
      <select name="requestType" defaultValue={defaultRequestType} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
        {inquiryTypes.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        name="message"
        required
        maxLength={2000}
        placeholder="说明你想咨询的服务、作品阶段、预计用途或希望服务商回复的问题。"
        className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm"
      />
      {workOptions.length ? (
        <select name="workId" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">不关联作品</option>
          {workOptions.map((work) => (
            <option key={work.id} value={work.id}>
              {work.title}
            </option>
          ))}
        </select>
      ) : null}
      <input name="expectedDate" type="date" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <fieldset className="rounded-[8px] bg-paper p-3">
        <legend className="text-sm font-semibold text-ink">联系方式授权</legend>
        <div className="mt-2 grid gap-2">
          {CONTACT_AUTH_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-[6px] bg-white px-3 py-2 text-sm text-ink/65">
              <input name="contactPreference" type="radio" value={option.value} defaultChecked={option.value === "SITE_ONLY"} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={isPending} className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
        {isPending ? "发送中..." : disabledReason ? "预览状态，不能发送" : "发送站内询盘"}
      </button>
    </form>
  );
}
