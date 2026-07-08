import Link from "next/link";
import { redirect } from "next/navigation";
import { DesignerIncubationPanel, type DesignerIncubationItem } from "@/components/incubation/DesignerIncubationPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/incubation";
import { PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { maskContact, PROVIDER_PROPOSAL_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

function sentence(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ") || "未填写补充说明";
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
      }))
    ])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Incubation</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">孵化管理</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">
            查看你的作品收到的预售意向、面料推荐、打样方案、工厂方案、采购意向，以及 V0.8 服务商方案对比信息。
          </p>
        </div>
        <Link href="/me" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          返回我的页面
        </Link>
      </header>

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
