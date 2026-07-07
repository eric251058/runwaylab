import { AdminEditorialPanel, type EditorialWorkItem } from "@/components/admin/AdminEditorialPanel";
import { getHeatScore } from "@/lib/operation-growth";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

export default async function AdminEditorialPage() {
  const works = await prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      user: true,
      editorialPicks: true,
      _count: {
        select: {
          presaleIntents: true,
          fabricProposals: true,
          sampleProposals: true,
          factoryProposals: true,
          buyerIntents: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: 80
  });

  const items: EditorialWorkItem[] = works
    .map((work) => ({
      id: work.id,
      title: work.title,
      author: work.user.nickname,
      status: work.contentStatus,
      heatScore: getHeatScore({
        likeCount: work.likeCount,
        favoriteCount: work.favoriteCount,
        commentCount: work.commentCount,
        presaleIntentCount: work._count.presaleIntents,
        fabricProposalCount: work._count.fabricProposals,
        sampleProposalCount: work._count.sampleProposals,
        factoryProposalCount: work._count.factoryProposals,
        buyerIntentCount: work._count.buyerIntents
      }),
      picks: work.editorialPicks.map((pick) => pick.type),
      isFeatured: work.isFeatured,
      isEditorPick: work.isEditorPick
    }))
    .sort((a, b) => b.heatScore - a.heatScore);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">运营推荐管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">
          设置首页精选、编辑推荐、热门作品、预售候选和孵化候选，也可以隐藏低质量或违规作品。
        </p>
      </header>
      <AdminEditorialPanel works={items} />
    </div>
  );
}
