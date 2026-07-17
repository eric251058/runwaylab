"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_AUTH_OPTIONS } from "@/lib/provider-experience";

type ContactAuthorizationControlProps = {
  inquiryId: string;
  initialValue?: string | null;
};

export function ContactAuthorizationControl({ inquiryId, initialValue }: ContactAuthorizationControlProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue || "SITE_ONLY");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/cooperation-requests/${inquiryId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPreference: value })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.message || "保存失败，请稍后再试。");
        return;
      }
      setMessage(result?.message || "联系方式授权已更新。");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2 rounded-[8px] bg-paper p-3">
      <p className="text-sm font-semibold text-ink">联系方式授权</p>
      <select value={value} onChange={(event) => setValue(event.target.value)} className="h-10 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
        {CONTACT_AUTH_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={save} disabled={isPending} className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50">
        {isPending ? "保存中..." : "保存授权"}
      </button>
      {message ? <p className="text-xs font-semibold text-lime-700">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
