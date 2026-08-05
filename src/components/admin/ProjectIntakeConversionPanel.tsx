"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectIntakeConversionPanelProps = {
  intakeId: string;
  status: string;
  expectedUpdatedAt: string;
  project: {
    id: string;
    title: string;
    createdAt: string;
    href: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ProjectIntakeConversionPanel({ intakeId, status, expectedUpdatedAt, project }: ProjectIntakeConversionPanelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function convert() {
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/admin/project-intakes/${intakeId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt })
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    setSubmitting(false);
    setConfirming(false);

    if (!response.ok) {
      setMessage(data?.message ?? "项目状态已更新，请刷新后重试。");
      return;
    }

    setMessage("正式项目已建立。");
    router.refresh();
  }

  if (project) {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Conversion</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">正式项目已建立</h2>
        <div className="mt-4 grid gap-3 text-sm text-ink/58">
          <p className="rounded-[8px] bg-paper p-3">正式项目：{project.title}</p>
          <p className="rounded-[8px] bg-paper p-3">正式项目 ID：{project.id}</p>
          <p className="rounded-[8px] bg-paper p-3">建立时间：{formatDate(project.createdAt)}</p>
        </div>
        <Link href={project.href} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          查看正式项目
        </Link>
      </section>
    );
  }

  const canConvert = status === "ACCEPTED";

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Conversion</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">建立正式项目</h2>
      <p className="mt-3 text-sm leading-6 text-ink/58">
        只有已通过评估且尚未建立正式项目的启动项目可以转化。创建后不会自动进入供应商匹配、生产或预售。
      </p>
      {message ? <p className="mt-4 rounded-[8px] bg-paper px-4 py-3 text-sm text-ink/62">{message}</p> : null}
      <button
        type="button"
        disabled={!canConvert || submitting}
        onClick={() => setConfirming(true)}
        className="mt-5 min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-45"
      >
        {submitting ? "建立中" : "建立正式项目"}
      </button>
      {!canConvert ? <p className="mt-3 text-sm text-ink/45">当前状态不能建立正式项目。</p> : null}

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-[0_24px_70px_rgba(16,16,16,0.22)]">
            <h3 className="text-xl font-semibold text-ink">确认建立正式项目？</h3>
            <p className="mt-3 text-sm leading-6 text-ink/62">
              系统会为该用户创建一个私有正式项目，并保留当前启动资料与评估记录。创建后不会自动进入供应商匹配、生产或预售。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                暂不处理
              </button>
              <button type="button" disabled={submitting} onClick={convert} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">
                {submitting ? "建立中" : "确认建立"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
