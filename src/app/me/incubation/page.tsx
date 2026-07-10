import Link from "next/link";
import { redirect } from "next/navigation";
import { DesignerIncubationPanel, type DesignerIncubationItem } from "@/components/incubation/DesignerIncubationPanel";
import { OpportunityProfileForm } from "@/components/incubation/OpportunityProfileForm";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/incubation";
import {
  calculateOrderMaturity,
  OPPORTUNITY_FABRIC_STATUS_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  PROVIDER_INTEREST_TYPE_LABELS,
  SAMPLE_STATUS_LABELS
} from "@/lib/order-maturity";
import { PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { maskContact, PROVIDER_PROPOSAL_TYPE_LABELS } from "@/lib/provider-market";
import { WorkVoteStatus, WorkVoteType } from "@prisma/client";

export const dynamic = "force-dynamic";

function sentence(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ") || "未填写补充说明";
}

function decimalText(value?: { toString(): string } | null) {
  return value ? value.toString() : null;
}

function signalState(done: boolean, active = false) {
  if (done) return "已完成";
  if (active) return "进行中";
  return "待完善";
}

export default async function MeIncubationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me/incubation");
  }

  const works = await prisma.work.findMany({
    where: {
      userId: user.id
    },
    select: {
      id: true,
      title: true,
      description: true,
      isEditorPick: true,
      favoriteCount: true,
      commentCount: true,
      images: {
        select: { id: true }
      },
      votes: {
        where: {
          status: WorkVoteStatus.ACTIVE,
          type: WorkVoteType.WANT_BUY
        },
        select: { id: true }
      },
      opportunityProfile: true,
      teacherRecommendations: {
        select: { id: true },
        take: 1
      },
      presaleIntents: { orderBy: { createdAt: "desc" } },
      presaleCampaigns: {
        include: {
          intents: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        },
        orderBy: { createdAt: "desc" }
      },
      fabricProposals: { orderBy: { createdAt: "desc" } },
      sampleProposals: { orderBy: { createdAt: "desc" } },
      factoryProposals: { orderBy: { createdAt: "desc" } },
      buyerIntents: { orderBy: { createdAt: "desc" } },
      fabricRecommendations: {
        include: {
          fabric: { include: { provider: true } },
          provider: true
        },
        orderBy: { createdAt: "desc" }
      },
      providerWorkProposals: {
        include: {
          provider: true
        },
        orderBy: { createdAt: "desc" }
      },
      providerOpportunityInterests: {
        include: {
          provider: true
        },
        orderBy: { updatedAt: "desc" }
      },
      collaborationProjects: {
        select: { id: true },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const presaleCampaigns = works.flatMap((work) =>
    work.presaleCampaigns.map((campaign) => ({
      ...campaign,
      workTitle: work.title
    }))
  );

  const items: DesignerIncubationItem[] = works
    .flatMap((work) => [
      ...work.presaleIntents.map((item) => ({
        id: item.id,
        kind: "presale" as const,
        kindLabel: "预售意向",
        workId: work.id,
        workTitle: work.title,
        primary: item.name,
        contact: item.contact,
        summary: sentence([item.size && `尺码 ${item.size}`, item.color && `颜色 ${item.color}`, item.quantity && `数量 ${item.quantity}`, item.acceptablePrice && `价格 ${item.acceptablePrice}`, item.message]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.fabricProposals.map((item) => ({
        id: item.id,
        kind: "fabric" as const,
        kindLabel: "面料推荐",
        workId: work.id,
        workTitle: work.title,
        primary: `${item.proposerName} 推荐 ${item.fabricName}`,
        company: item.companyName,
        contact: item.contact,
        summary: sentence([item.composition, item.weight, item.width, item.priceRange, item.reason]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.sampleProposals.map((item) => ({
        id: item.id,
        kind: "sample" as const,
        kindLabel: "打样方案",
        workId: work.id,
        workTitle: work.title,
        primary: item.proposerName,
        company: item.studioName,
        contact: item.contact,
        summary: sentence([item.serviceType, item.category, item.leadTime, item.priceRange, item.message]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.factoryProposals.map((item) => ({
        id: item.id,
        kind: "factory" as const,
        kindLabel: "工厂方案",
        workId: work.id,
        workTitle: work.title,
        primary: item.proposerName,
        company: item.factoryName,
        contact: item.contact,
        summary: sentence([item.category, item.moq && `起订量 ${item.moq}`, item.leadTime, item.unitPriceRange, item.message]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.buyerIntents.map((item) => ({
        id: item.id,
        kind: "buyer" as const,
        kindLabel: "采购意向",
        workId: work.id,
        workTitle: work.title,
        primary: item.buyerName,
        company: item.companyName,
        contact: item.contact,
        summary: sentence([item.channelType, item.quantity && `数量 ${item.quantity}`, item.targetPrice, item.cooperationType, item.message]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.fabricRecommendations.map((item) => ({
        id: item.id,
        kind: "providerFabric" as const,
        kindLabel: "面料库推荐",
        workId: work.id,
        workTitle: work.title,
        primary: item.fabric.name,
        company: item.provider?.name ?? item.fabric.provider?.name,
        contact: maskContact(item.provider?.contactPhone ?? item.fabric.provider?.contactPhone ?? item.provider?.contactEmail ?? item.fabric.provider?.contactEmail),
        summary: sentence([item.fabric.composition, item.fabric.weight, item.fabric.width, item.reason]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.providerWorkProposals.map((item) => ({
        id: item.id,
        kind: "providerProposal" as const,
        kindLabel: PROVIDER_PROPOSAL_TYPE_LABELS[item.type],
        workId: work.id,
        workTitle: work.title,
        primary: item.title,
        company: item.provider.name,
        contact: maskContact(item.provider.contactPhone ?? item.provider.contactEmail ?? item.provider.wechat),
        summary: sentence([item.description, item.estimatedPrice && `预计价格 ${item.estimatedPrice}`, item.estimatedTime && `预计周期 ${item.estimatedTime}`, item.moq && `MOQ ${item.moq}`]),
        status: item.status,
        createdAt: formatDateTime(item.createdAt)
      })),
      ...work.providerOpportunityInterests.map((item) => ({
        id: item.id,
        kind: "opportunityInterest" as const,
        kindLabel: "服务商机会意向",
        workId: work.id,
        workTitle: work.title,
        primary: item.provider.name,
        company: PROVIDER_INTEREST_TYPE_LABELS[item.interestType],
        contact: "联系方式由平台协助对接",
        summary: sentence([
          item.expectedPriceMin || item.expectedPriceMax ? `预计价格 ${decimalText(item.expectedPriceMin) ?? "-"}-${decimalText(item.expectedPriceMax) ?? "-"}` : null,
          item.minimumQuantity ? `最低数量 ${item.minimumQuantity}` : null,
          item.leadDays ? `预计周期 ${item.leadDays} 天` : null,
          item.note
        ]),
        status: item.status,
        createdAt: formatDateTime(item.updatedAt)
      }))
    ])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Incubation</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">孵化管理</h1>
          <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4 md:line-clamp-none">
            孵化进度不是订单状态，而是作品从展示到打样、预售和合作的验证过程。
          </p>
        </div>
        <Link href="/me" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink sm:w-fit">
          返回我的页面
        </Link>
      </header>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Signals</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">作品孵化信号</h2>
        </div>
        {works.length ? (
          <div className="grid gap-4">
            {works.map((work) => {
              const profile = work.opportunityProfile;
              const fabricCount = work.fabricProposals.length + work.fabricRecommendations.length;
              const presaleCount = work.presaleIntents.length + work.presaleCampaigns.reduce((sum, campaign) => sum + campaign.currentCount, 0);
              const providerProposalCount = work.sampleProposals.length + work.factoryProposals.length + work.providerWorkProposals.length;
              const opportunityInterestCount = work.providerOpportunityInterests.length;
              const hasTeacherRecommendation = work.teacherRecommendations.length > 0;
              const hasProject = work.collaborationProjects.length > 0;
              const maturity = calculateOrderMaturity({
                description: work.description,
                imageCount: work.images.length,
                isEditorPick: work.isEditorPick,
                teacherRecommendationCount: work.teacherRecommendations.length,
                fabricRecommendationCount: fabricCount,
                providerProposalCount,
                presaleIntentCount: presaleCount,
                buyerInterestCount: work.buyerIntents.length,
                wantBuyVoteCount: work.votes.length,
                favoriteCount: work.favoriteCount,
                commentCount: work.commentCount,
                profile
              });
              const advice = !hasTeacherRecommendation
                ? "建议完善作品说明，或参加挑战赛。"
                : fabricCount === 0
                  ? "平台会根据作品方向匹配面料商。"
                  : presaleCount === 0
                    ? "可以联系平台开启预售活动。"
                    : providerProposalCount === 0
                      ? "可以补充机会资料，等待匹配服务商。"
                      : "继续跟进收到的方案。";
              const signals = [
                ["老师推荐", signalState(hasTeacherRecommendation)],
                ["面料推荐", signalState(false, fabricCount > 0)],
                ["服务商方案", signalState(false, providerProposalCount > 0)],
                ["机会意向", signalState(false, opportunityInterestCount > 0)],
                ["预售意向", signalState(false, presaleCount > 0)],
                ["合作项目", signalState(hasProject)]
              ];

              return (
                <article key={work.id} className="rounded-[8px] border border-black/8 bg-paper p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{work.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        {signals.map(([label, value]) => (
                          <span key={label} className="rounded-full bg-white px-3 py-1 text-ink/55">{label}：{value}</span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-ink/52">下一步：{advice}</p>
                    </div>
                    <Link href={`/works/${work.id}`} className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink md:w-auto">
                      查看作品
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-2 rounded-[8px] bg-white p-3 text-xs text-ink/55 sm:grid-cols-2 lg:grid-cols-4">
                    <span>机会阶段：{profile ? OPPORTUNITY_STAGE_LABELS[profile.stage] : "未维护"}</span>
                    <span>推荐阶段：{OPPORTUNITY_STAGE_LABELS[maturity.recommendedStage]}</span>
                    <span>样衣：{profile ? SAMPLE_STATUS_LABELS[profile.sampleStatus] : "未维护"}</span>
                    <span>面料：{profile ? OPPORTUNITY_FABRIC_STATUS_LABELS[profile.fabricStatus] ?? "未维护" : "未维护"}</span>
                    <span>专业 {maturity.professionalScore}</span>
                    <span>生产 {maturity.productionScore}</span>
                    <span>市场 {maturity.marketScore}</span>
                    <span>服务商意向 {opportunityInterestCount}</span>
                  </div>
                  <OpportunityProfileForm
                    workId={work.id}
                    initialProfile={profile ? {
                      stage: profile.stage,
                      targetQuantity: profile.targetQuantity,
                      targetRetailPrice: decimalText(profile.targetRetailPrice),
                      sampleBudget: decimalText(profile.sampleBudget),
                      sampleStatus: profile.sampleStatus,
                      fabricStatus: profile.fabricStatus,
                      targetLaunchDate: profile.targetLaunchDate ? profile.targetLaunchDate.toISOString().slice(0, 10) : null,
                      expectedReorder: profile.expectedReorder,
                      designerNote: profile.designerNote
                    } : null}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm text-ink/55">你还没有发布作品。先发布作品后，这里会显示孵化信号。</div>
        )}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Presale Validation</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">我的预售验证</h2>
          </div>
          <Link href="/presale" className="text-sm font-semibold text-ink/55 hover:text-ink">
            查看预售池
          </Link>
        </div>

        {presaleCampaigns.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {presaleCampaigns.map((campaign) => {
              const progress = presaleProgress(campaign.currentCount, campaign.targetCount);
              return (
                <article key={campaign.id} className="rounded-[8px] border border-black/8 bg-paper p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PRESALE_CAMPAIGN_STATUS_LABELS[campaign.status]}</span>
                    {campaign.isFeatured ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">推荐</span> : null}
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{campaign.title}</h3>
                  <p className="mt-1 text-sm text-ink/52">{campaign.workTitle}</p>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink/45">
                      <span>{campaign.currentCount} / {campaign.targetCount} 人</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-ink/50">
                    最近意向 {campaign.intents.length} 条。预计价格：{campaign.estimatedPrice ?? "待定"}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm text-ink/55">你的作品暂时还没有预售验证活动。后台开启后会显示在这里。</div>
        )}
      </section>

      <DesignerIncubationPanel items={items} />
    </div>
  );
}
