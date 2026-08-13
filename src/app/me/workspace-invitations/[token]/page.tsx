import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { InvitationActions } from "./invitation-actions";

export default async function WorkspaceInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/workspace-invitations/" + token);

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true, description: true } } },
  });
  if (!invitation) notFound();

  const ownsInvitation =
    Boolean(user.email) && invitation.email === user.email?.toLowerCase();
  const isPending =
    invitation.status === "PENDING" && invitation.expiresAt.getTime() > Date.now();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-12">
      <section className="w-full rounded-[28px] border border-black/10 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-ink/45">
          Workspace invitation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          加入 {invitation.workspace.name}
        </h1>
        <p className="mt-3 text-ink/60">
          {invitation.workspace.description || "和伙伴一起把作品、项目与机会连接起来。"}
        </p>
        <div className="mt-5 rounded-2xl bg-black/[.035] p-4 text-sm text-ink/65">
          邀请角色：{invitation.role === "ADMIN" ? "管理员" : "成员"}
        </div>
        {!ownsInvitation ? (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            请使用收到邀请的邮箱账号登录。
          </p>
        ) : isPending ? (
          <InvitationActions token={token} workspaceId={invitation.workspace.id} />
        ) : (
          <p className="mt-5 rounded-2xl bg-black/[.035] p-4 text-sm text-ink/65">
            这份邀请已处理或已过期。
          </p>
        )}
        <Link href="/me/workspaces" className="mt-6 inline-block text-sm text-ink/55">
          返回我的空间
        </Link>
      </section>
    </main>
  );
}
