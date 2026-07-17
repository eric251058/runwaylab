import Link from "next/link";
import { ProjectIssueStatus, ProjectIssueType, type Prisma } from "@prisma/client";
import { isFeatureEnabled } from "@/lib/features";
import { updateProjectIssue } from "@/lib/projects/actions";
import { PROJECT_ISSUE_STATUS_LABELS, PROJECT_ISSUE_TYPE_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminProjectIssuesPageProps = {
  searchParams?: Promise<{ type?: string; status?: string }>;
};

function isIssueType(value: unknown): value is ProjectIssueType {
  return typeof value === "string" && Object.values(ProjectIssueType).includes(value as ProjectIssueType);
}

function isIssueStatus(value: unknown): value is ProjectIssueStatus {
  return typeof value === "string" && Object.values(ProjectIssueStatus).includes(value as ProjectIssueStatus);
}

function dateText(value: Date) {
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminProjectIssuesPage({ searchParams }: AdminProjectIssuesPageProps) {
  const params = (await searchParams) ?? {};
  const enabled = await isFeatureEnabled("feature.project_marketplace_v22");
  const type = isIssueType(params.type) ? params.type : null;
  const status = isIssueStatus(params.status) ? params.status : null;
  const where: Prisma.ProjectIssueWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {})
  };
  const issues = enabled
    ? await prisma.projectIssue.findMany({
        where,
        include: {
          project: { select: { id: true, slug: true, title: true } },
          reporter: { select: { nickname: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 200
      })
    : [];

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">项目问题管理</h1>
      </header>

      {enabled ? (
        <form className="mb-5 grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
          <select name="type" defaultValue={type ?? ""} className={input}>
            <option value="">全部异常类型</option>
            {Object.values(ProjectIssueType).map((item) => (
              <option key={item} value={item}>{PROJECT_ISSUE_TYPE_LABELS[item]}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} className={input}>
            <option value="">全部状态</option>
            {Object.values(ProjectIssueStatus).map((item) => (
              <option key={item} value={item}>{PROJECT_ISSUE_STATUS_LABELS[item]}</option>
            ))}
          </select>
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">筛选</button>
        </form>
      ) : null}

      {!enabled ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">Project Marketplace V2.2 功能开关未开启。</div>
      ) : issues.length ? (
        <div className="space-y-3">
          {issues.map((issue) => (
            <form key={issue.id} action={updateProjectIssue} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[1fr_180px_1fr_auto]">
              <input type="hidden" name="id" value={issue.id} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-ink">{issue.title}</h2>
                <p className="mt-1 text-sm text-ink/52">
                  {PROJECT_ISSUE_TYPE_LABELS[issue.type]} / {issue.reporter.nickname} / <Link href={`/projects/${issue.project.slug ?? issue.project.id}`} className="underline">{issue.project.title}</Link>
                </p>
                <p className="mt-1 text-xs text-ink/40">创建时间：{dateText(issue.createdAt)}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{issue.description ?? "无补充说明"}</p>
              </div>
              <select name="status" defaultValue={issue.status} className={input}>
                {Object.values(ProjectIssueStatus).map((status) => (
                  <option key={status} value={status}>{PROJECT_ISSUE_STATUS_LABELS[status]}</option>
                ))}
              </select>
              <input name="adminNote" defaultValue={issue.adminNote ?? ""} placeholder="处理备注" className={input} />
              <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
            </form>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无项目问题。</div>
      )}
    </div>
  );
}
