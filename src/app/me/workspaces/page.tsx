import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceCreateForm } from "./workspace-create-form";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/workspaces");
  const spaces = await prisma.workspace.findMany({
    where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, status: "ACTIVE" } } }] },
    include: {
      _count: {
        select: {
          members: { where: { status: "ACTIVE" } },
          works: true,
          projects: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
    <div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/45">Open Workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">让创意找到合作者</h1><p className="mt-3 max-w-2xl text-ink/60">空间不是审批系统，而是用户自主组织作品、人才、供应链和市场验证的容器。</p></div>
    <div className="grid gap-7 lg:grid-cols-[1fr_380px]"><section className="grid content-start gap-4">
      {spaces.length ? spaces.map((space) => <Link key={space.id} href={`/me/workspaces/${space.id}`} className="rounded-[24px] border border-black/8 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink">{space.name}</h2><p className="mt-2 text-sm text-ink/55">{space.description || "这个空间正在形成自己的方向。"}</p></div><span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-ink/55">{space.visibility}</span></div>
        <div className="mt-5 flex gap-5 text-sm text-ink/50"><span>{space._count.members} 成员</span><span>{space._count.works} 作品</span><span>{space._count.projects} 项目</span></div>
      </Link>) : <div className="rounded-[24px] border border-dashed border-black/15 p-8 text-ink/55">你还没有空间。先创建一个真实项目空间，而不是空的组织档案。</div>}
    </section><WorkspaceCreateForm /></div>
  </main>;
}
