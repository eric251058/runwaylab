"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminAiDiagnosisActionsProps = {
  diagnosisId: string;
};

const buttonClass = "inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto";

export function AdminAiDiagnosisActions({ diagnosisId }: AdminAiDiagnosisActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState("");

  const act = async (action: "approve" | "needsRevision" | "reject" | "note" | "regenerate") => {
    if (action === "regenerate" && !window.confirm("确认重新生成？这会创建新版本，不会覆盖旧诊断。")) return;

    setBusy(action);
    setMessage("");
    const response = await fetch(`/api/admin/ai-diagnoses/${diagnosisId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(action === "regenerate" ? { action } : { action, adminNote })
    });
    const data = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(data?.message ?? "操作失败，请稍后再试。");
      return;
    }

    setMessage(data?.message ?? "操作已保存。");
    router.refresh();
  };

  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-sm font-semibold text-ink">管理员审核</p>
      <textarea
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        placeholder="管理员备注，可选"
        className="mt-3 min-h-24 w-full rounded-[6px] border border-black/10 bg-paper p-3 text-sm outline-none"
      />
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        <button disabled={busy !== null} onClick={() => act("approve")} className={`${buttonClass} bg-ink text-white`}>
          通过
        </button>
        <button disabled={busy !== null} onClick={() => act("needsRevision")} className={`${buttonClass} border border-black/10 bg-white text-ink`}>
          需调整
        </button>
        <button disabled={busy !== null} onClick={() => act("reject")} className={`${buttonClass} border border-red-200 bg-red-50 text-red-700`}>
          拒绝
        </button>
        <button disabled={busy !== null} onClick={() => act("note")} className={`${buttonClass} border border-black/10 bg-white text-ink`}>
          保存备注
        </button>
        <button disabled={busy !== null} onClick={() => act("regenerate")} className={`${buttonClass} bg-accent text-ink`}>
          重新生成
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-ink/58">{message}</p> : null}
    </div>
  );
}
