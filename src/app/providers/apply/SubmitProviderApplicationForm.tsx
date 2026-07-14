"use client";

import { useState, useTransition } from "react";
import { applyProvider } from "@/lib/provider-market-admin";

const providerTypes = [
  ["FABRIC_SUPPLIER", "面料商"],
  ["SAMPLE_STUDIO", "制版打样工作室"],
  ["FACTORY", "服装工厂"],
  ["OTHER", "其他专业服务"]
] as const;

export function SubmitProviderApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      try {
        await applyProvider(formData);
        setSubmitted(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试");
      }
    });
  }

  if (submitted) {
    return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/65">申请已提交。平台审核后会联系你完善服务商主页，并协助你参与作品孵化方案提交。</div>;
  }

  return (
    <form action={onSubmit} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{message}</p> : null}
      <select name="providerType" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm">
        {providerTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
      </select>
      <input name="companyName" required placeholder="公司/工作室名称" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="contactName" required placeholder="联系人" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="phone" placeholder="手机号，可选" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="email" placeholder="联系邮箱，默认使用登录邮箱" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="wechat" placeholder="微信，可选" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="city" placeholder="城市" className="h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="description" placeholder="简介：擅长品类、可提供的服务、参考周期。" className="min-h-32 w-full rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <button disabled={isPending} className="h-12 w-full rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">
        {isPending ? "提交中..." : "提交入驻申请"}
      </button>
    </form>
  );
}
