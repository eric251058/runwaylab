import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/workspace-permissions";
import { saveWorkspaceTeachingNote } from "./actions";

const reviewLabels: Record<string, string> = {
  PENDING: "待平台审核",
  APPROVED: "已发布",
  REJECTED: "需要修改",
  OFFLINE: "已下架"
};

export default async function WorkspaceTeachingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/me/workspaces/${id}/teaching`);
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: { where: { status: "ACTIVE" }, include: { user: { select: { nickname: true } } }, orderBy: { joinedAt: "asc" } },
      works: {
        include: {
          user: { select: { nickname: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          teacherRecommendations: { orderBy: { createdAt: "desc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" }
      },
      projects: {
        include: { work: { select: { title: true } }, actions: { where: { status: { in: ["ACTIVE", "WAITING_PLATFORM_CONFIRMATION"] } }, orderBy: { updatedAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" }
      }
    }
  });
  if (!workspace) notFound();
  const access = workspace.members.find((member) => member.userId === user.id) ?? null;
  if (!(user.role === "ADMIN" || workspace.ownerId === user.id || canManageWorkspace(access))) notFound();

  const metrics = [
    ["参与成员", workspace.members.length],
    ["待审核作品", workspace.works.filter((work) => work.reviewStatus === "PENDING").length],
    ["需要修改", workspace.works.filter((work) => work.reviewStatus === "REJECTED").length],
    ["推进中项目", workspace.projects.filter((project) => !["COMPLETED", "CANCELLED"].includes(project.status)).length]
  ] as const;

  return <main className="mx-auto min-h-screen max-w-7xl px-5 py-10">
    <Link href={`/me/workspaces/${id}`} className="text-sm text-ink/55">← 返回空间</Link>
    <header className="mt-5 rounded-[28px] bg-ink px-6 py-8 text-white md:px-9">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/50">Teaching View</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{workspace.name} · 教学操作台</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">用真实作品和项目组织指导，不创建课程档案，不替学生做决定。</p>
    </header>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) =>
      <div key={label} className="rounded-[20px] border border-black/8 bg-white p-5"><p className="text-sm text-ink/50">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>
    )}</section>
    <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_380px]">
      <section><h2 className="text-2xl font-semibold">作品指导</h2><div className="mt-4 grid gap-4">
        {workspace.works.length ? workspace.works.map((work) => {
          const latest = work.teacherRecommendations[0];
          return <article key={work.id} className="rounded-[24px] border border-black/8 bg-white p-5">
            <div className="flex gap-4">{work.images[0] ? <img src={work.images[0].imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-black/5" />}
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{work.title}</h3><span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-ink/55">{reviewLabels[work.reviewStatus] || work.reviewStatus}</span></div><p className="mt-1 text-sm text-ink/50">作者：{work.user.nickname}</p><Link href={`/works/${work.id}`} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">查看作品</Link></div>
            </div>
            {latest ? <div className="mt-4 rounded-2xl bg-paper p-4"><p className="text-xs font-semibold text-ink/45">{latest.tag || "最近指导"}</p><p className="mt-2 text-sm leading-6 text-ink/65">{latest.note || "已记录导师推荐。"}</p></div> : <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-ink/50">还没有指导记录。</p>}
            <form action={saveWorkspaceTeachingNote} className="mt-4 grid gap-3">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input type="hidden" name="workId" value={work.id} />
              <input name="tag" maxLength={30} placeholder="指导标签，例如：结构调整" className="h-11 rounded-xl border border-black/10 px-3 text-sm" />
              <textarea name="note" required minLength={2} maxLength={500} placeholder="给方向和判断依据，不替学生直接做决定。" className="min-h-24 rounded-xl border border-black/10 px-3 py-3 text-sm" />
              <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">记录指导</button>
            </form>
          </article>;
        }) : <div className="rounded-[24px] border border-dashed border-black/15 p-8 text-sm text-ink/55">空间还没有作品。先邀请成员加入真实作品，不创建空课程。</div>}
      </div></section>
      <aside className="rounded-[24px] border border-black/8 bg-white p-5"><h2 className="text-xl font-semibold">项目推进</h2><div className="mt-4 grid gap-3">
        {workspace.projects.length ? workspace.projects.map((project) => <Link key={project.id} href={`/me/projects/${project.id}`} className="rounded-2xl bg-black/[.035] p-4"><p className="font-semibold">{project.title}</p><p className="mt-1 text-xs text-ink/45">{project.status}{project.work ? ` · ${project.work.title}` : ""}</p><p className="mt-2 text-sm text-ink/60">{project.actions[0]?.title || "等待参与者决定下一步"}</p></Link>) : <p className="text-sm text-ink/50">作品形成真实合作意向后再进入项目，不强制转化。</p>}
      </div></aside>
    </div>
  </main>;
}
