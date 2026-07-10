import Link from "next/link";
import {
  ContributionPersona,
  ContributionStatus,
  ContributionType,
  Prisma,
  WorkVoteStatus,
  WorkVoteType
} from "@prisma/client";
import { AdminContributionsPanel, type AdminContributionItem } from "@/components/admin/AdminContributionsPanel";
import { AdminVotesPanel, type AdminVoteItem } from "@/components/admin/AdminVotesPanel";
import { actorSourceLabel } from "@/lib/contribution-actor";
import {
  CONTRIBUTION_PERSONA_OPTIONS,
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_STATUS_OPTIONS,
  CONTRIBUTION_TYPE_OPTIONS
} from "@/lib/user-contributions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminContributionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

function stat(label: string, value: number, description: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/45">{description}</p>
    </div>
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function enumValue<T extends string>(value: string | undefined, values: readonly T[]) {
  return value && values.includes(value as T) ? (value as T) : "";
}

function pageHref(page: number, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/admin/contributions?${next.toString()}`;
}

export default async function AdminContributionsPage({ searchParams }: AdminContributionsPageProps) {
  const params = await searchParams;
  const status = enumValue(firstValue(params?.status), Object.values(ContributionStatus));
  const persona = enumValue(firstValue(params?.persona), Object.values(ContributionPersona));
  const type = enumValue(firstValue(params?.type), Object.values(ContributionType));
  const workQuery = firstValue(params?.work)?.trim() ?? "";
  const keyword = firstValue(params?.keyword)?.trim() ?? "";
  const order = firstValue(params?.order) === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(firstValue(params?.page) ?? "1", 10) || 1);
  const currentParams = new URLSearchParams();

  if (status) currentParams.set("status", status);
  if (persona) currentParams.set("persona", persona);
  if (type) currentParams.set("type", type);
  if (workQuery) currentParams.set("work", workQuery);
  if (keyword) currentParams.set("keyword", keyword);
  if (order === "asc") currentParams.set("order", order);

  const contributionWhere: Prisma.WorkContributionWhereInput = {};

  if (status) contributionWhere.status = status;
  if (persona) contributionWhere.persona = persona;
  if (type) contributionWhere.type = type;
  if (workQuery) {
    contributionWhere.work = {
      title: {
        contains: workQuery,
        mode: "insensitive"
      }
    };
  }
  if (keyword) {
    contributionWhere.OR = [
      { content: { contains: keyword, mode: "insensitive" } },
      { name: { contains: keyword, mode: "insensitive" } },
      { contact: { contains: keyword, mode: "insensitive" } },
      { work: { title: { contains: keyword, mode: "insensitive" } } }
    ];
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    stats,
    voteGroups,
    latestVotes,
    contributionCount,
    contributions,
    recentContributionActors,
    duplicateSeed
  ] = await Promise.all([
    Promise.all([
      prisma.workContribution.count({ where: { status: ContributionStatus.NEW } }),
      prisma.workContribution.count({ where: { status: ContributionStatus.VALUABLE } }),
      prisma.workContribution.count({ where: { status: ContributionStatus.PROCESSED } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.HIDDEN } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE, type: WorkVoteType.WANT_BUY } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE, type: WorkVoteType.CONFUSING } })
    ]),
    prisma.workVote.groupBy({
      by: ["workId", "type"],
      where: {
        status: WorkVoteStatus.ACTIVE
      },
      _count: {
        _all: true
      }
    }),
    prisma.workVote.findMany({
      include: {
        work: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 60
    }),
    prisma.workContribution.count({ where: contributionWhere }),
    prisma.workContribution.findMany({
      where: contributionWhere,
      include: {
        work: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: order
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.workContribution.groupBy({
      by: ["actorKey"],
      where: {
        createdAt: {
          gte: since
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.workContribution.findMany({
      select: {
        actorKey: true,
        content: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 500
    })
  ]);

  const [pendingContributionCount, valuableContributionCount, processedContributionCount, activeVoteCount, hiddenVoteCount, wantBuyVoteCount, confusingVoteCount] = stats;
  const workIds = [...new Set(voteGroups.map((item) => item.workId))];
  const voteWorks = workIds.length ? await prisma.work.findMany({
    where: {
      id: {
        in: workIds
      }
    },
    select: {
      id: true,
      title: true,
      user: {
        select: {
          nickname: true
        }
      }
    }
  }) : [];
  const workMap = new Map(voteWorks.map((work) => [work.id, work]));
  const voteOverview = workIds.map((workId) => {
    const work = workMap.get(workId);
    const counts = Object.fromEntries(voteGroups.filter((item) => item.workId === workId).map((item) => [item.type, item._count._all]));

    return {
      workId,
      workTitle: work?.title ?? "作品已删除",
      designerName: work?.user.nickname ?? "未知设计师",
      total: Object.values(counts).reduce((sum, value) => sum + Number(value), 0),
      counts
    };
  }).sort((left, right) => right.total - left.total).slice(0, 20);
  const highFrequencyActors = new Set(recentContributionActors.filter((item) => item._count._all >= 5).map((item) => item.actorKey));
  const duplicateContentKeys = new Set<string>();
  const duplicateCounter = new Map<string, number>();

  for (const item of duplicateSeed) {
    const key = `${item.actorKey}:${item.content}`;
    duplicateCounter.set(key, (duplicateCounter.get(key) ?? 0) + 1);
  }
  for (const [key, value] of duplicateCounter.entries()) {
    if (value > 1) duplicateContentKeys.add(key);
  }

  const contributionItems: AdminContributionItem[] = contributions.map((item) => {
    const riskFlags = [
      highFrequencyActors.has(item.actorKey) ? "高频提交" : null,
      duplicateContentKeys.has(`${item.actorKey}:${item.content}`) ? "重复内容" : null,
      item.content.trim().length < 8 ? "内容过短" : null,
      item.contact ? null : "无联系方式"
    ].filter((flag): flag is string => Boolean(flag));

    return {
      id: item.id,
      workTitle: item.work.title,
      persona: item.persona,
      type: item.type,
      content: item.content,
      name: item.name,
      contact: item.contact,
      status: item.status,
      adminNote: item.adminNote,
      sourceLabel: actorSourceLabel(item.actorKey),
      riskFlags,
      createdAt: item.createdAt.toISOString()
    };
  });
  const voteItems: AdminVoteItem[] = latestVotes.map((vote) => ({
    id: vote.id,
    workTitle: vote.work.title,
    type: vote.type,
    status: vote.status,
    sourceLabel: actorSourceLabel(vote.actorKey),
    adminNote: vote.adminNote,
    createdAt: vote.createdAt.toISOString()
  }));
  const totalPages = Math.max(1, Math.ceil(contributionCount / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">用户贡献管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">这里汇总用户、老师、服务商和买手对作品的投票与孵化建议。用户贡献默认不公开，管理员可筛选有价值内容用于后续孵化、预售和合作推进。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {stat("待处理建议", pendingContributionCount, "仍需要运营筛选")}
        {stat("有价值建议", valuableContributionCount, "已标记可推进")}
        {stat("已处理建议", processedContributionCount, "已完成运营处理")}
        {stat("有效投票", activeVoteCount, "参与运营判断")}
        {stat("隐藏投票", hiddenVoteCount, "不参与统计")}
        {stat("想买判断", wantBuyVoteCount, "有效购买兴趣")}
        {stat("看不懂判断", confusingVoteCount, "需要优化表达")}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Vote Signals</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">投票概览</h2>
          </div>
          <p className="text-sm leading-6 text-ink/55">仅统计有效投票，不在作品详情公开具体数量。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs font-semibold text-ink/40">
              <tr className="border-b border-black/8">
                <th className="py-3 pr-3">作品</th>
                <th className="py-3 pr-3">想买</th>
                <th className="py-3 pr-3">适合打样</th>
                <th className="py-3 pr-3">适合量产</th>
                <th className="py-3 pr-3">适合秀场</th>
                <th className="py-3 pr-3">看不懂</th>
                <th className="py-3 pr-3">入口</th>
              </tr>
            </thead>
            <tbody>
              {voteOverview.length ? voteOverview.map((item) => (
                <tr key={item.workId} className="border-b border-black/8 last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-ink">{item.workTitle}</p>
                    <p className="mt-1 text-xs text-ink/45">{item.designerName}</p>
                  </td>
                  <td className="py-3 pr-3">{item.counts.WANT_BUY ?? 0}</td>
                  <td className="py-3 pr-3">{item.counts.SUITABLE_SAMPLE ?? 0}</td>
                  <td className="py-3 pr-3">{item.counts.SUITABLE_PRODUCTION ?? 0}</td>
                  <td className="py-3 pr-3">{item.counts.SUITABLE_RUNWAY ?? 0}</td>
                  <td className="py-3 pr-3">{item.counts.CONFUSING ?? 0}</td>
                  <td className="py-3 pr-3">
                    <Link href={`/works/${item.workId}`} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink">查看作品</Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-6 text-sm text-ink/55">暂无用户投票。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Vote Review</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">投票治理</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">隐藏投票不会删除数据，也不会参与后台统计和作品信号判断。</p>
        </div>
        <AdminVotesPanel votes={voteItems} />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Advice</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">用户建议列表</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/45">
            {Object.entries(CONTRIBUTION_STATUS_LABELS).map(([itemStatus, label]) => (
              <span key={itemStatus} className="rounded-full bg-white px-3 py-1">{label}</span>
            ))}
          </div>
        </div>

        <form className="mb-4 grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
          <select name="status" defaultValue={status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="">全部状态</option>
            {CONTRIBUTION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="persona" defaultValue={persona} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="">全部身份</option>
            {CONTRIBUTION_PERSONA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="type" defaultValue={type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="">全部类型</option>
            {CONTRIBUTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input name="work" defaultValue={workQuery} placeholder="关联作品" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="keyword" defaultValue={keyword} placeholder="关键词" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <select name="order" defaultValue={order} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="desc">最新优先</option>
            <option value="asc">最早优先</option>
          </select>
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white md:col-span-3 xl:col-span-6">筛选建议</button>
        </form>

        <AdminContributionsPanel contributions={contributionItems} />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink/45">第 {page} / {totalPages} 页，共 {contributionCount} 条建议</p>
          <div className="flex gap-2">
            {page > 1 ? <Link href={pageHref(page - 1, currentParams)} className="rounded-full border border-black/10 px-4 py-2 font-semibold text-ink">上一页</Link> : null}
            {page < totalPages ? <Link href={pageHref(page + 1, currentParams)} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">下一页</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
