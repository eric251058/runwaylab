import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CollaborationProjectVisibility,
  ContentStatus,
  ReviewStatus,
  UserRole,
  WorkVisibility,
  type Prisma
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PROJECT_STATUSES } from "@/lib/projects/rules";
import {
  canViewWorkspace,
  canViewWorkspaceMemberEmail,
  type WorkspaceAccess
} from "@/lib/workspace-permissions";
import { WorkspaceMemberActions } from "./workspace-member-actions";
import { WorkspaceMemberAdminActions } from "./workspace-member-admin-actions";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect("/login?next=/me/workspaces/" + id);
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) notFound();
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
    select: { role: true, status: true }
  });
  const isOwner = workspace.ownerId === user.id;
  const isGlobalAdmin = user.role === UserRole.ADMIN;
  const access: WorkspaceAccess = membership?.status === "ACTIVE"
    ? membership
    : isOwner
      ? { role: "OWNER", status: "ACTIVE" }
      : null;
  if (!canViewWorkspace({ visibility: workspace.visibility, isOwner, access, isGlobalAdmin })) notFound();

  const canSeeMemberEmail = isGlobalAdmin || canViewWorkspaceMemberEmail(access);
  const canOpenTeaching = isGlobalAdmin || access?.role === "OWNER" || access?.role === "ADMIN";
  const canManagePrivateWorks = isGlobalAdmin || access?.role === "OWNER" || access?.role === "ADMIN";
  const workWhere: Prisma.WorkWhereInput = canManagePrivateWorks
    ? { workspaceId: id }
    : access
      ? {
          workspaceId: id,
          OR: [
            { visibility: { in: [WorkVisibility.PUBLIC, WorkVisibility.COLLABORATORS] } },
            { userId: user.id }
          ]
        }
      : {
          workspaceId: id,
          visibility: WorkVisibility.PUBLIC,
          reviewStatus: ReviewStatus.APPROVED,
          contentStatus: ContentStatus.VISIBLE
        };
  const projectWhere: Prisma.CollaborationProjectWhereInput = isGlobalAdmin
    ? { workspaceId: id }
    : {
        workspaceId: id,
        OR: [
          {
            visibility: CollaborationProjectVisibility.PUBLIC,
            status: { in: [...PUBLIC_PROJECT_STATUSES] }
          },
          { designerId: user.id },
          { ownerUserId: user.id },
          { createdById: user.id },
          { work: { userId: user.id } }
        ]
      };
  const [members, works, projects, workCount, projectCount] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: id, status: "ACTIVE" },
      include: { user: { select: { id: true, nickname: true, email: true } } },
      orderBy: { joinedAt: "asc" }
    }),
    prisma.work.findMany({ where: workWhere, select: { id: true, title: true, reviewStatus: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.collaborationProject.findMany({ where: projectWhere, select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.work.count({ where: workWhere }),
    prisma.collaborationProject.count({ where: projectWhere })
  ]);

  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
    <Link href="/me/workspaces" className="text-sm text-ink/55">← 返回我的空间</Link>
    <div className="mt-5">
      <p className="text-sm font-semibold uppercase tracking-[.18em] text-ink/45">{workspace.visibility}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{workspace.name}</h1>
      <p className="mt-3 max-w-2xl text-ink/60">{workspace.description || "从共同目标开始，把作品、伙伴和项目逐步连接起来。"}</p>
      {canOpenTeaching ? <Link href={`/me/workspaces/${workspace.id}/teaching`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">进入教学操作台</Link> : null}
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="grid gap-6">
        <div className="rounded-[24px] border border-black/10 bg-white p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">作品</h2><span className="text-sm text-ink/45">{workCount}</span></div>
          <div className="mt-4 grid gap-3">{works.length ? works.map((work) =>
            <Link key={work.id} href={"/works/" + work.id} className="rounded-2xl bg-black/[.035] p-4"><span className="font-semibold">{work.title}</span><span className="ml-3 text-xs text-ink/45">{work.reviewStatus}</span></Link>
          ) : <p className="text-sm text-ink/50">空间还没有作品。下一步开放“把我的作品加入空间”。</p>}</div>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">项目</h2><span className="text-sm text-ink/45">{projectCount}</span></div>
          <div className="mt-4 grid gap-3">{projects.length ? projects.map((project) =>
            <div key={project.id} className="rounded-2xl bg-black/[.035] p-4"><span className="font-semibold">{project.title}</span><span className="ml-3 text-xs text-ink/45">{project.status}</span></div>
          ) : <p className="text-sm text-ink/50">作品获得真实兴趣后，可以在这里发起协作项目。</p>}</div>
        </div>
      </section>
      <aside className="rounded-[24px] border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">成员 · {members.filter((member) => member.status === "ACTIVE").length}</h2>
        <div className="mt-4 grid gap-3">{members.filter((member) => member.status === "ACTIVE").map((member) =>
          <div key={member.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.user.nickname}</p>{canSeeMemberEmail ? <p className="truncate text-xs text-ink/45">{member.user.email}</p> : null}</div>
            <WorkspaceMemberAdminActions
                    workspaceId={workspace.id}
                    memberId={member.id}
                    memberRole={member.role}
                    actorRole={access?.role}
                    isSelf={member.userId === user.id}
                  />
          </div>
        )}</div>
        <WorkspaceMemberActions
          workspaceId={workspace.id}
          canInvite={access?.role === "OWNER" || access?.role === "ADMIN"}
          canLeave={Boolean(access && access.role !== "OWNER")}
        />
      </aside>
    </div>
  </main>;
}
