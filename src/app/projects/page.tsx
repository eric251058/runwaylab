import { CollaborationProjectStatus, Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT_STATUS_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { projectOpportunityNeeds } from "@/lib/project-applications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "合作项目",
  description: "发现正在推进的服装项目与明确的设计、面料、打样和生产合作需求。"
};

type ProjectsPageProps = {
  searchParams: Promise<{ q?: string; stage?: string; need?: string }>;
};

const NEED_OPTIONS = [
  { value: "lead", label: "主理与协同" },
  { value: "fabric", label: "面料合作" },
  { value: "production", label: "打样与生产" },
  { value: "market", label: "买手与市场反馈" }
] as const;

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 60);
  const stage = Object.values(CollaborationProjectStatus).includes(params.stage as CollaborationProjectStatus)
    ? (params.stage as CollaborationProjectStatus)
    : null;
  const need = NEED_OPTIONS.some((option) => option.value === params.need) ? params.need : null;
  const filters: Prisma.CollaborationProjectWhereInput[] = [publicProjectWhere()];
  if (query) {
    filters.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { work: { is: { title: { contains: query, mode: "insensitive" } } } }
      ]
    });
  }
  if (stage) filters.push({ status: stage });
  if (need === "lead") filters.push({ ownerUserId: null, ownerProviderId: null });
  if (need === "fabric") filters.push({ fabricId: null });
  if (need === "production") filters.push({ providerId: null });
  if (need === "market") filters.push({ presaleCampaignId: null });

  const projects = await prisma.collaborationProject.findMany({
    where: { AND: filters },
    include: {
      work: { include: { images: { orderBy: { sortOrder: "asc" } }, user: true } },
      provider: true,
      school: true,
      teacher: true,
      _count: { select: { orders: { where: { preorderCampaignId: null } }, reviews: true, applications: true } }
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 60
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-12">
      <header className="rounded-[10px] bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Open Project Marketplace</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">让好创意找到一起实现的人</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58 md:mt-4">从主理人、面料、打样、生产到买手和市场伙伴，用户可以自由发起连接。平台提供可信信息与协作空间，不替双方决定合作。</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/me/project-applications" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">我的参与中心</Link>
          <Link href="/start" className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">发起项目</Link>
        </div>
      </header>

      <form className="mt-5 grid gap-3 rounded-[10px] border border-black/8 bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
        <input name="q" defaultValue={query} maxLength={60} placeholder="搜索项目、作品或合作方向" className="min-h-11 rounded-[8px] border border-black/10 px-3 text-sm outline-none focus:border-ink/40" />
        <select name="stage" defaultValue={stage ?? ""} className="min-h-11 rounded-[8px] border border-black/10 bg-white px-3 text-sm text-ink">
          <option value="">全部项目阶段</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="need" defaultValue={need ?? ""} className="min-h-11 rounded-[8px] border border-black/10 bg-white px-3 text-sm text-ink">
          <option value="">全部合作机会</option>
          {NEED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">查找机会</button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm text-ink/45">
        <p>找到 {projects.length} 个开放项目</p>
        {(query || stage || need) ? <Link href="/projects" className="font-semibold text-ink hover:underline">清除筛选</Link> : null}
      </div>

      {projects.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const needs = projectOpportunityNeeds(project);
            const imageUrl = project.work?.images[0]?.imageUrl;
            return (
              <Link key={project.id} href={"/projects/" + (project.slug ?? project.id)} className="group overflow-hidden rounded-[10px] border border-black/8 bg-white transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-lg">
                {imageUrl ? <div className="aspect-[16/10] bg-cover bg-center" style={{ backgroundImage: "url(" + JSON.stringify(imageUrl) + ")" }} /> : <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-sm text-ink/35">项目视觉准备中</div>}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
                    {needs.slice(0, 2).map((item) => <span key={item.key} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{item.label}</span>)}
                  </div>
                  <h2 className="mt-4 line-clamp-2 text-xl font-semibold text-ink">{project.title}</h2>
                  <p className="mt-2 text-sm text-ink/52">关联作品：{project.work?.title ?? "待关联"}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/56">{project.description ?? "围绕作品推进资源匹配、打样验证与商业合作。"}</p>
                  <p className="mt-3 text-xs text-ink/42">参与申请 {project._count.applications} · 市场意向 {project._count.orders} · 公开评价 {project._count.reviews}</p>
                  <span className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">查看并参与</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[10px] border border-dashed border-black/10 bg-white p-8 text-center text-sm text-ink/55">当前筛选下没有项目，可以清除筛选或发起新的合作项目。</div>
      )}
    </div>
  );
}
