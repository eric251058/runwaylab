"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PROVIDER_INQUIRY_TYPE_LABELS } from "@/lib/supply-network";

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
};

const inquiryTypes = Object.entries(PROVIDER_INQUIRY_TYPE_LABELS);

export function ProviderInquiryForm({ providerId, workOptions, loginHref, isLoggedIn, fabricId, showcaseItemId }: ProviderInquiryFormProps) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <div className="rounded-[8px] border border-black/8 bg-white p-4">
        <h3 className="text-lg font-semibold text-ink">发起合作询盘</h3>
        <p className="mt-2 text-sm leading-6 text-ink/55">登录后可以关联自己的作品，向服务商提交结构化合作需求。</p>
        <Link href={loginHref} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white sm:w-fit">
          登录后发起合作
        </Link>
      </div>
    );
  }

  function onSubmit(formData: FormData) {
    setMessage("");
    setSuccess("");
    const payload = {
      providerId,
      fabricId,
      showcaseItemId,
      workId: formData.get("workId")?.toString() || null,
      requestType: formData.get("requestType")?.toString() || "GENERAL",
      quantity: formData.get("quantity")?.toString() || null,
      budgetRange: formData.get("budgetRange")?.toString() || null,
      expectedDate: formData.get("expectedDate")?.toString() || null,
      contactPreference: formData.get("contactPreference")?.toString() || null,
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
        setMessage(result?.message || "提交失败，请稍后重试");
        return;
      }
      setSuccess("合作需求已发送给服务商。服务商会在工作台收到通知，建议在 48 小时内处理。你可以在“我的合作需求”查看进度。");
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-ink">发起合作询盘</h3>
        <p className="mt-1 text-sm leading-6 text-ink/55">请用一段清楚的话说明你需要面料、打样还是生产支持。24 小时内同一服务商最多提交 5 次。</p>
      </div>
      {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      {success ? <p className="rounded-[6px] bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
      <select name="workId" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
        <option value="">不关联作品</option>
        {workOptions.map((work) => (
          <option key={work.id} value={work.id}>{work.title}</option>
        ))}
      </select>
      <select name="requestType" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
        {inquiryTypes.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <input name="quantity" inputMode="numeric" placeholder="预计数量，可选" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="message" required maxLength={2000} placeholder="详细说明需求、作品阶段、预期周期和希望服务商回复的问题。" className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
      <details className="rounded-[8px] bg-paper p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">补充更多信息（可选）</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="budgetRange" placeholder="预算范围，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
          <input name="expectedDate" type="date" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
          <input name="contactPreference" placeholder="联系方式偏好，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm sm:col-span-2" />
        </div>
      </details>
      <button disabled={isPending} className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
        {isPending ? "提交中..." : "提交合作询盘"}
      </button>
    </form>
  );
}
