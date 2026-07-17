"use client";

import { useState, useTransition } from "react";

const ISSUE_TYPE_OPTIONS = [
  ["NO_UPDATE", "长时间没有更新"],
  ["DELAY", "项目延期"],
  ["OWNER_UNREACHABLE", "项目负责人失联"],
  ["QUALITY_CONCERN", "质量问题"],
  ["DESCRIPTION_MISMATCH", "与页面描述不符"],
  ["COPYRIGHT", "原创或版权问题"],
  ["PROVIDER_BREACH", "服务商未按约履行"],
  ["OTHER", "其他问题"]
] as const;

type ProjectIssueFormProps = {
  projectId: string;
  isLoggedIn: boolean;
};

export function ProjectIssueForm({ projectId, isLoggedIn }: ProjectIssueFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitIssue(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.get("type"),
          title: formData.get("title"),
          description: formData.get("description")
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(response.ok ? "异常反馈已提交，平台会在后台查看处理。" : data?.error ?? "提交失败，请稍后再试。");
    });
  }

  return (
    <details className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">反馈项目异常</summary>
      <p className="mt-3 text-sm leading-6 text-ink/58">用于报告延期、质量、版权或履约问题。这里不会开启私信聊天。</p>
      {isLoggedIn ? (
        <form action={submitIssue} className="mt-4 grid gap-3">
          <select name="type" defaultValue="OTHER" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm">
            {ISSUE_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input name="title" required maxLength={80} placeholder="一句话说明问题" className="h-11 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none focus:border-ink" />
          <textarea name="description" maxLength={1000} placeholder="补充说明，可选" className="min-h-24 rounded-[6px] border border-black/10 bg-paper px-3 py-3 text-sm outline-none focus:border-ink" />
          <button disabled={isPending} className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-60">
            {isPending ? "提交中..." : "提交异常反馈"}
          </button>
        </form>
      ) : (
        <a href={`/login?next=/projects/${projectId}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          登录后反馈
        </a>
      )}
      {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
    </details>
  );
}
