import Link from "next/link";
import {
  PROJECT_INTAKE_STATUS_LABELS,
  categoryLabel,
  expectedPriceBandLabel,
  getAdminProjectIntakes,
  launchTimingLabel,
  needLabel,
  normalizeProjectIntakeAdminFilter,
  projectIntakeTitle,
  sourceLabel,
  useScenarioLabel
} from "@/lib/start-projects";

export const dynamic = "force-dynamic";

type AdminProjectIntakesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const filters = [
  ["WAITING", "等待评估"],
  ["NEEDS_INFO", "需要补充"],
  ["ACCEPTED_PENDING", "待建立项目"],
  ["CONVERTED", "已建立项目"],
  ["ACCEPTED", "全部通过"],
  ["DECLINED", "暂不适合"],
  ["ALL", "全部"]
] as const;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value?: Date | null) {
  if (!value) return "未提交";
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminProjectIntakesPage({ searchParams }: AdminProjectIntakesPageProps) {
  const params = await searchParams;
  const filter = normalizeProjectIntakeAdminFilter(firstParam(params?.filter));
  const page = Number(firstParam(params?.page) ?? 1);
  const result = await getAdminProjectIntakes({ filter, page, pageSize: 20 });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Project Intake</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">启动项目评估</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">只处理用户主动提交的平台评估。这里不展示公开作品热度，也不导出用户创意。</p>
      </header>

      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([value, label]) => (
          <Link key={value} href={`/admin/project-intakes?filter=${value}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-ink text-white" : "border border-black/10 bg-white text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-3">
        {result.items.length ? (
          result.items.map((item) => (
            <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_INTAKE_STATUS_LABELS[item.status]}</span>
                    {item.linkedCollaborationProject ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">已建立正式项目</span> : null}
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">完成度 {item.completion}%</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">提交 {formatDate(item.submittedForReviewAt)}</span>
                  </div>
                  <h2 className="mt-3 truncate text-xl font-semibold text-ink">{projectIntakeTitle(item)}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{item.ideaText ?? "未填写一句话想法"}</p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-ink/45 sm:grid-cols-2 lg:grid-cols-4">
                    <span>{item.owner.nickname}</span>
                    <span>{sourceLabel(item.sourceType)} / {categoryLabel(item.category, item.categoryOther)}</span>
                    <span>{needLabel(item.primaryNeed)} / {useScenarioLabel(item.useScenario)}</span>
                    <span>{expectedPriceBandLabel(item.expectedPriceBand)} / {launchTimingLabel(item.launchTiming)}</span>
                  </div>
                </div>
                <div className="grid gap-2 lg:w-36">
                  <Link href={`/admin/project-intakes/${item.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
                    查看评估
                  </Link>
                  {item.linkedCollaborationProject ? (
                    <span className="text-center text-xs font-semibold text-ink/42">{item.linkedCollaborationProject.title}</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-8 text-center text-sm text-ink/55">暂无符合条件的启动项目。</div>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm font-semibold text-ink/55">
        <span>第 {result.page} / {result.pageCount} 页，共 {result.total} 条</span>
        <div className="flex gap-2">
          {result.page > 1 ? <Link href={`/admin/project-intakes?filter=${filter}&page=${result.page - 1}`} className="rounded-full border border-black/10 px-4 py-2">上一页</Link> : null}
          {result.page < result.pageCount ? <Link href={`/admin/project-intakes?filter=${filter}&page=${result.page + 1}`} className="rounded-full border border-black/10 px-4 py-2">下一页</Link> : null}
        </div>
      </div>
    </main>
  );
}
