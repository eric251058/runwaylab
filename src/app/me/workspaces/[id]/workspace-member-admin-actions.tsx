"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "OWNER" | "ADMIN" | "MEMBER";

export function WorkspaceMemberAdminActions({
  workspaceId, memberId, memberRole, actorRole, isSelf,
}: {
  workspaceId: string;
  memberId: string;
  memberRole: Role;
  actorRole?: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canEditRole = actorRole === "OWNER" && !isSelf && memberRole !== "OWNER";
  const canRemove = !isSelf && memberRole !== "OWNER" &&
    (actorRole === "OWNER" || (actorRole === "ADMIN" && memberRole === "MEMBER"));
  const canTransfer = actorRole === "OWNER" && !isSelf && memberRole !== "OWNER";

  async function run(url: string, init: RequestInit, fallback: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, init);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || fallback);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function changeRole(role: "ADMIN" | "MEMBER") {
    return run("/api/workspaces/" + workspaceId + "/members/" + memberId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }, "角色更新失败");
  }

  function removeMember() {
    if (!window.confirm("确认将这位成员移出空间？其历史记录会保留。")) return;
    return run("/api/workspaces/" + workspaceId + "/members/" + memberId, {
      method: "DELETE",
    }, "移除成员失败");
  }

  function transferOwnership() {
    if (!window.confirm("确认转移空间所有权？你将变为空间管理员。")) return;
    return run("/api/workspaces/" + workspaceId + "/ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    }, "所有权转移失败");
  }

  if (!canEditRole && !canRemove && !canTransfer) {
    return <span className="text-xs text-ink/45">{memberRole}</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEditRole ? (
        <select aria-label="成员角色" value={memberRole} disabled={busy}
          onChange={(event) => changeRole(event.target.value as "ADMIN" | "MEMBER")}
          className="rounded-full border border-ink/10 bg-white px-2 py-1 text-xs">
          <option value="MEMBER">成员</option>
          <option value="ADMIN">管理员</option>
        </select>
      ) : <span className="text-xs text-ink/45">{memberRole}</span>}
      {canTransfer ? (
        <button onClick={transferOwnership} disabled={busy}
          className="text-xs font-semibold text-ink/60 disabled:opacity-40">转移所有权</button>
      ) : null}
      {canRemove ? (
        <button onClick={removeMember} disabled={busy}
          className="text-xs font-semibold text-red-700 disabled:opacity-40">移除</button>
      ) : null}
      {message ? <p className="w-full text-right text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
