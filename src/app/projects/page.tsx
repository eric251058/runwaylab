import Link from "next/link";
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.collaborationProject.findMany({
    where: publicProjectWhere(),
    include: {
      work: { include: { images: { orderBy: { sortOrder: "asc" } }, user: true } },
      provider: true,
      school: true,
      teacher: true,
      _count: { select: { orders: true, reviews: true } }
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 60
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Collaboration Projects</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">合作项目</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">公开展示已进入协作框架的作品项目。这里不收款、不生成商城订单，只记录合作推进状态。</p>
      </header>

      {projects.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug ?? project.id}`} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROJECT_PRIORITY_LABELS[project.priority]}</span>
              </div>
              <h2 className="mt-4 line-clamp-2 text-xl font-semibold text-ink">{project.title}</h2>
              <p className="mt-2 text-sm text-ink/52">{project.work.title} / {project.work.user.nickname}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/56">{project.description ?? "项目说明待补充"}</p>
              <p className="mt-3 text-xs text-ink/42">
                {[project.school?.name, project.teacher?.name, project.provider?.name].filter(Boolean).join(" / ") || "关联方待补充"} / 意向 {project._count.orders}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无公开合作项目。</div>
      )}
    </div>
  );
}
