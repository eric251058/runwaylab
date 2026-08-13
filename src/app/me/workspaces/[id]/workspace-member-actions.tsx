"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceMemberActions({
  workspaceId,
  canInvite,
  canLeave,
}: {
  workspaceId: string;
  canInvite: boolean;
  canLeave: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "邀请失败");
    } else {
      setInviteUrl(window.location.origin + data.acceptPath);
      setEmail("");
      setMessage("邀请已创建，把链接发给对方即可。");
    }
    setBusy(false);
  }

  async function leave() {
    if (!window.confirm("确认退出这个空间？退出后需要重新接受邀请才能加入。")) return;
    setBusy(true);
    const response = await fetch(`/api/workspaces/${workspaceId}/members/me`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "退出失败");
      setBusy(false);
      return;
    }
    router.push("/me/workspaces");
    router.refresh();
  }

  return (
    <div className="mt-5 grid gap-4 border-t border-black/10 pt-5">
      {canInvite ? (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">邀请伙伴</h3>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="伙伴邮箱"
            type="email"
            maxLength={254}
            className="rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "MEMBER" | "ADMIN")}
              className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
            >
              <option value="MEMBER">成员</option>
              <option value="ADMIN">管理员</option>
            </select>
            <button
              onClick={invite}
              disabled={busy || !email.trim()}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              创建邀请
            </button>
          </div>
          {inviteUrl ? (
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="break-all rounded-xl bg-black/[.04] p-3 text-left text-xs text-ink/65"
            >
              {inviteUrl}
              <span className="mt-1 block font-semibold text-ink">点击复制邀请链接</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="text-xs text-ink/60">{message}</p> : null}
      {canLeave ? (
        <button
          onClick={leave}
          disabled={busy}
          className="justify-self-start text-xs font-semibold text-red-700 disabled:opacity-40"
        >
          退出空间
        </button>
      ) : null}
    </div>
  );
}
