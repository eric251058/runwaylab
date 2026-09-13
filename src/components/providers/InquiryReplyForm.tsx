"use client";

import { inquirySubmissionId } from "@/lib/inquiry-submission";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type InquiryReplyFormProps = {
  inquiryId: string;
  placeholder?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

async function readMessage(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message ?? "发送失败，请稍后再试。";
}

export function InquiryReplyForm({ inquiryId, placeholder = "写下回复内容", buttonLabel = "发送回复", disabled = false }: InquiryReplyFormProps) {
  const router = useRouter();
  const submitting = useRef(false);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (disabled || submitting.current) return;
    setMessage("");
    setError("");
    const text = content.trim();
    if (!text) {
      setError("请填写回复内容。");
      return;
    }

    submitting.current = true;
    startTransition(async () => {
      try {
      const body = JSON.stringify({ content: text });
      const clientId = await inquirySubmissionId(`reply:${inquiryId}`, body);
      const response = await fetch(`/api/cooperation-requests/${inquiryId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(body), clientId })
      });

      if (!response.ok) {
        setError(await readMessage(response));
        return;
      }

      await inquirySubmissionId(`reply:${inquiryId}`, body, true);
      setContent("");
      setMessage("回复已发送。");
      router.refresh();
      } catch {
        setError("连接中断，回复内容已保留。可直接重试同一内容，系统会避免重复保存。");
      } finally { submitting.current = false; }
    });
  }

  return (
    <div className="grid gap-2">
      <textarea
        aria-label="询盘回复内容"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={disabled || isPending}
        maxLength={1000}
        placeholder={placeholder}
        className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm leading-6 disabled:bg-paper disabled:text-ink/35"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink/35">{content.length}/1000</span>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || isPending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "发送中..." : buttonLabel}
        </button>
      </div>
      {message ? <p role="status" className="rounded-[6px] bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-800">{message}</p> : null}
      {error ? <p role="alert" className="rounded-[6px] bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
