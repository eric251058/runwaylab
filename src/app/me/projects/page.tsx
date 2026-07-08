import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/projects");

  const projects = await prisma.collaborationProject.findMany({
    where: {
      OR: [
        { designerId: user.id },
        { work: { userId: user.id } },
        { createdById: user.id },
        { orders: { some: { buyerId: user.id } } }
      ]
    },
    include: { work: true, provider: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 80
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Projects</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">我的合作项目</h1>
      </header>
      <section className="space-y-3">
        {projects.length ? projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.slug ?? project.id}`} className="block rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
            <h2 className="mt-3 font-semibold text-ink">{project.title}</h2>
            <p className="mt-1 text-sm text-ink/52">{project.work.title} / {project.provider?.name ?? "服务商待关联"} / 意向 {project._count.orders}</p>
          </Link>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂时没有与你相关的合作项目。</div>}
      </section>
    </div>
  );
}
