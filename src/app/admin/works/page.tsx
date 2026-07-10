import { ContributionType, ReviewStatus, WorkVoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminWorksPanel, type AdminWorkItem } from "@/components/admin/AdminWorksPanel";
import { getHeatScore } from "@/lib/operation-growth";

export const dynamic = "force-dynamic";

const reviewStatusRank: Record<string, number> = {
  [ReviewStatus.PENDING]: 0,
  [ReviewStatus.APPROVED]: 1,
  [ReviewStatus.REJECTED]: 2,
  [ReviewStatus.OFFLINE]: 3
};

export default async function AdminWorksPage() {
  const works = await prisma.work.findMany({
    where: {
      reviewStatus: {
        in: [ReviewStatus.PENDING, ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.OFFLINE]
      }
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      user: true,
      challengeEntries: true,
      teacherRecommendations: true,
      fabricRecommendations: true,
      fabricProposals: true,
      providerWorkProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true,
      presaleCampaigns: true,
      presaleCampaignIntents: true,
      votes: true,
      contributions: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const items: AdminWorkItem[] = [...works].sort((left, right) => {
    const statusDiff = reviewStatusRank[left.reviewStatus] - reviewStatusRank[right.reviewStatus];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  }).map((work) => {
    const fabricSignalCount = work.fabricRecommendations.length + work.fabricProposals.length;
    const serviceSignalCount = work.providerWorkProposals.length + work.sampleProposals.length + work.factoryProposals.length + work.buyerIntents.length;
    const presaleSignalCount = work.presaleCampaigns.length + work.presaleCampaignIntents.length;
    const wantBuyVoteCount = work.votes.filter((vote) => vote.type === WorkVoteType.WANT_BUY).length;
    const sampleVoteCount = work.votes.filter((vote) => vote.type === WorkVoteType.SUITABLE_SAMPLE).length;
    const productionVoteCount = work.votes.filter((vote) => vote.type === WorkVoteType.SUITABLE_PRODUCTION).length;
    const confusingVoteCount = work.votes.filter((vote) => vote.type === WorkVoteType.CONFUSING).length;
    const buyerInterestCount = work.contributions.filter((contribution) => contribution.type === ContributionType.BUYER_INTEREST).length;
    const heatScore = getHeatScore({
      likeCount: work.likeCount,
      favoriteCount: work.favoriteCount,
      commentCount: work.commentCount,
      presaleIntentCount: work.presaleCampaignIntents.length,
      fabricProposalCount: fabricSignalCount,
      sampleProposalCount: work.providerWorkProposals.length + work.sampleProposals.length,
      factoryProposalCount: work.factoryProposals.length,
      buyerIntentCount: work.buyerIntents.length
    });
    const operationTags = [
      work.images.length ? null : "缺图片",
      work.description.trim() ? null : "缺说明",
      work.teacherRecommendations.length ? null : "缺老师推荐",
      fabricSignalCount ? null : "缺面料推荐",
      serviceSignalCount ? null : "缺服务商方案",
      work.presaleCampaigns.length ? null : "缺预售验证",
      heatScore >= 20 || work.isFeatured || work.isEditorPick ? "高潜力" : null,
      work.wantsIncubation || work.teacherRecommendations.length > 0 || fabricSignalCount > 0 || serviceSignalCount > 0 ? "适合孵化" : null,
      presaleSignalCount > 0 || work.favoriteCount >= 5 || work.likeCount >= 10 ? "适合预售" : null,
      wantBuyVoteCount >= 3 ? "想买较多" : null,
      sampleVoteCount >= 2 ? "适合打样" : null,
      productionVoteCount >= 2 ? "适合量产" : null,
      confusingVoteCount >= 3 ? "看不懂较多" : null,
      work.contributions.length ? "有用户建议" : null,
      buyerInterestCount ? "有买手兴趣" : null
    ].filter((tag): tag is string => Boolean(tag));

    return {
      id: work.id,
      title: work.title,
      category: work.category,
      workType: work.workType,
      reviewStatus: work.reviewStatus,
      isAiAssisted: work.isAiAssisted,
      isOriginal: work.isOriginal,
      isOpenCoop: work.isOpenCoop,
      wantsFabric: work.wantsFabric,
      wantsSample: work.wantsSample,
      wantsIncubation: work.wantsIncubation,
      isFeatured: work.isFeatured,
      isEditorPick: work.isEditorPick,
      heatScore,
      operationTags,
      createdAt: work.createdAt.toISOString(),
      user: {
        nickname: work.user.nickname,
        email: work.user.email
      },
      images: work.images.map((image) => ({ imageUrl: image.imageUrl })),
      challengeEntries: work.challengeEntries.map((entry) => ({ id: entry.id }))
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">作品管理</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">处理作品审核，同时查看内容完整度、高潜力、孵化和预售相关运营标签。</p>
      </header>
      <AdminWorksPanel works={items} />
    </div>
  );
}
