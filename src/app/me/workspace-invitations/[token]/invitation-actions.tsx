"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvitationActions({
  token,
  workspaceId,
}: {
  token: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(action: "accept" | "decline") {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/workspace-invitations/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "操作失败");
      setBusy(false);
      return;
    }
    if (action === "accept") {
      router.push(`/me/workspaces/${workspaceId}`);
    } else {
      router.push("/me/workspaces");
    }
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <button
        onClick={() => decide("accept")}
        disabled={busy}
        className="rounded-2xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-40"
      >
        接受并加入
      </button>
      <button
        onClick={() => decide("decline")}
        disabled={busy}
        className="rounded-2xl border border-black/10 px-5 py-3 font-semibold disabled:opacity-40"
      >
        暂不加入
      </button>
      {message ? <p className="text-sm text-red-700 sm:col-span-2">{message}</p> : null}
    </div>
  );
}
