import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentStatus, OpportunityStage, ReviewStatus } from "@prisma/client";
import { ProviderOpportunityInterestForm } from "@/components/providers/ProviderOpportunityInterestForm";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import {
  calculateOrderMaturity,
  OPPORTUNITY_FABRIC_STATUS_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  providerCanSeeStage,
  providerRecommendationReason,
  SAMPLE_STATUS_LABELS
} from "@/lib/order-maturity";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimalText(value?: { toString(): string } | null) {
  return value ? value.toString() : "未填写";
}

export default async function ProviderOpportunitiesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/providers/opportunities");
  }

  const provider = await getProviderForUser(user);

  if (!provider) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-[8px] border border-black/8 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Opportunity Pool</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">请先完成服务商入驻和资料审核</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">机会池仅向已审核服务商开放。当前轻量关联方式为服务商联系邮箱与登录邮箱一致。</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/providers/apply" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">服务商入驻</Link>
            <Link href="/providers" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-ink">查看服务商市场</Link>
          </div>
        </div>
      </div>
    );
  }

  const works = await prisma.work.findMany({
    where: {
      reviewStatus: ReviewStatus.APPROVED,
      contentStatus: ContentStatus.VISIBLE,
      opportunityProfile: {
        adminApproved: true,
        stage: {
          not: OpportunityStage.DISPLAY_ONLY
        }
      }
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      user: true,
      teacherRecommendations: true,
      fabricRecommendations: true,
      providerWorkProposals: true,
      presaleCampaignIntents: true,
      buyerIntents: true,
      votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
      opportunityProfile: true,
      providerOpportunityInterests: {
        where: {
          providerId: provider.id
        }
      }
    },
    orderBy: [{ isEditorPick: "desc" }, { createdAt: "desc" }],
    take: 80
  });
  const opportunities = works
    .filter((work) => work.opportunityProfile && providerCanSeeStage(provider, work.opportunityProfile))
    .map((work, index) => {
      const profile = work.opportunityProfile!;
      const maturity = calculateOrderMaturity({
        description: work.description,
        imageCount: work.images.length,
        isEditorPick: work.isEditorPick,
        teacherRecommendationCount: work.teacherRecommendations.length,
        fabricRecommendationCount: work.fabricRecommendations.length,
        providerProposalCount: work.providerWorkProposals.length,
        presaleIntentCount: work.presaleCampaignIntents.length,
        buyerInterestCount: work.buyerIntents.length,
        wantBuyVoteCount: work.votes.length,
        favoriteCount: work.favoriteCount,
        commentCount: work.commentCount,
        profile
      });

      return { work, profile, maturity, imageUrl: visualFor(index, work.images[0]?.imageUrl) };
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Qualified Opportunities</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">合格机会池</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">这里只展示管理员审核通过、且与你服务能力和订单偏好匹配的项目。</p>
        </div>
        <Link href="/me/provider-profile" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">完善服务能力</Link>
      </header>

      {opportunities.length ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {opportunities.map(({ work, profile, maturity, imageUrl }) => (
            <article key={work.id} className="overflow-hidden rounded-[8px] border border-black/8 bg-paper">
              <img src={imageUrl} alt={work.title} className="aspect-[16/9] w-full object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{OPPORTUNITY_STAGE_LABELS[profile.stage]}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{SAMPLE_STATUS_LABELS[profile.sampleStatus]}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{OPPORTUNITY_FABRIC_STATUS_LABELS[profile.fabricStatus] ?? "面料状态待确认"}</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-ink">{work.title}</h2>
                <p className="mt-1 text-sm text-ink/52">{work.user.nickname} / {work.category}</p>
                <div className="mt-4 grid gap-2 text-xs font-semibold text-ink/55 sm:grid-cols-2">
                  <span>目标数量：{profile.targetQuantity ?? "未填写"}</span>
                  <span>目标零售价：{decimalText(profile.targetRetailPrice)}</span>
                  <span>预计上线：{profile.targetLaunchDate ? profile.targetLaunchDate.toLocaleDateString("zh-CN") : "未填写"}</span>
                  <span>后续补单：{profile.expectedReorder ? "有可能" : "未明确"}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-[6px] bg-white p-3">
                    <p className="text-xs text-ink/40">专业</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{maturity.professionalScore}</p>
                  </div>
                  <div className="rounded-[6px] bg-white p-3">
                    <p className="text-xs text-ink/40">生产</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{maturity.productionScore}</p>
                  </div>
                  <div className="rounded-[6px] bg-white p-3">
                    <p className="text-xs text-ink/40">市场</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{maturity.marketScore}</p>
                  </div>
                </div>
                <p className="mt-4 rounded-[6px] bg-white px-3 py-2 text-sm leading-6 text-ink/58">推荐原因：{providerRecommendationReason(provider, profile)}</p>
                {maturity.missingItems.length ? <p className="mt-3 text-xs leading-5 text-ink/45">仍缺：{maturity.missingItems.slice(0, 3).join("、")}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/works/${work.id}`} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">查看作品</Link>
                </div>
                <ProviderOpportunityInterestForm workId={work.id} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          暂无与你能力匹配的合格机会。你可以先完善服务能力，或等待平台审核更多成熟项目。
        </div>
      )}
    </div>
  );
}
