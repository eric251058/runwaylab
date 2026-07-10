import Link from "next/link";
import { ContributionStatus, WorkVoteType } from "@prisma/client";
import { AdminContributionsPanel, type AdminContributionItem } from "@/components/admin/AdminContributionsPanel";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/user-contributions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function stat(label: string, value: number, description: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/45">{description}</p>
    </div>
  );
}

export default async function AdminContributionsPage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [stats, votes, contributions] = await Promise.all([
    Promise.all([
      prisma.workContribution.count({ where: { createdAt: { gte: since } } }),
      prisma.workContribution.count({ where: { status: ContributionStatus.VALUABLE } }),
      prisma.workContribution.count({ where: { status: ContributionStatus.NEW } }),
      prisma.workVote.count(),
      prisma.workVote.count({ where: { type: WorkVoteType.WANT_BUY } }),
      prisma.workVote.count({ where: { type: WorkVoteType.CONFUSING } })
    ]),
    prisma.workVote.findMany({
      include: {
        work: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                nickname: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 500
    }),
    prisma.workContribution.findMany({
      include: {
        work: {
          select: {
            title: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 120
    })
  ]);
  const [newContributionCount, valuableContributionCount, pendingContributionCount, totalVoteCount, wantBuyVoteCount, confusingVoteCount] = stats;
  const voteMap = new Map<string, {
    workId: string;
    workTitle: string;
    designerName: string;
    total: number;
    counts: Record<string, number>;
  }>();

  for (const vote of votes) {
    const item = voteMap.get(vote.workId) ?? {
      workId: vote.workId,
      workTitle: vote.work.title,
      designerName: vote.work.user.nickname,
      total: 0,
      counts: {}
    };
    item.total += 1;
    item.counts[vote.type] = (item.counts[vote.type] ?? 0) + 1;
    voteMap.set(vote.workId, item);
  }

  const voteOverview = [...voteMap.values()].sort((left, right) => right.total - left.total).slice(0, 20);
  const contributionItems: AdminContributionItem[] = contributions.map((item) => ({
    id: item.id,
    workTitle: item.work.title,
    persona: item.persona,
    type: item.type,
    content: item.content,
    name: item.name,
    contact: item.contact,
    status: item.status,
    adminNote: item.adminNote,
    createdAt: item.createdAt.toISOString()
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">用户贡献管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">这里汇总用户、老师、服务商和买手对作品的投票与孵化建议。用户贡献默认不公开，管理员可筛选有价值内容用于后续孵化、预售和合作推进。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {stat("新增建议数", newContributionCount, "过去 24 小时提交建议")}
        {stat("有价值建议数", valuableContributionCount, "已被运营标记有价值")}
        {stat("待处理建议数", pendingContributionCount, "仍需要运营筛选")}
        {stat("用户投票数", totalVoteCount, "累计作品判断")}
        {stat("想买票数", wantBuyVoteCount, "表达购买兴趣")}
        {stat("看不懂票数", confusingVoteCount, "需要优化表达")}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Vote Signals</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">投票概览</h2>
          </div>
          <p className="text-sm leading-6 text-ink/55">只用于后台运营判断，不在作品详情公开具体数量。</p>
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

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Advice</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">用户建议列表</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/45">
            {Object.entries(CONTRIBUTION_STATUS_LABELS).map(([status, label]) => (
              <span key={status} className="rounded-full bg-white px-3 py-1">{label}</span>
            ))}
          </div>
        </div>
        <AdminContributionsPanel contributions={contributionItems} />
      </section>
    </div>
  );
}
