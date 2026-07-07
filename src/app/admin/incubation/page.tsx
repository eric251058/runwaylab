import { AdminIncubationPanel, type AdminIncubationItem } from "@/components/admin/AdminIncubationPanel";
import { formatDateTime, getIncubationRuleText, incubationStatusLabels } from "@/lib/incubation";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { WorkIncubationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function sentence(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ") || "未填写补充说明";
}

export default async function AdminIncubationPage() {
  const works = await prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      user: true,
      workIncubation: true,
      presaleIntents: {
        orderBy: {
          createdAt: "desc"
        }
      },
      fabricProposals: {
        orderBy: {
          createdAt: "desc"
        }
      },
      sampleProposals: {
        orderBy: {
          createdAt: "desc"
        }
      },
      factoryProposals: {
        orderBy: {
          createdAt: "desc"
        }
      },
      buyerIntents: {
        orderBy: {
          createdAt: "desc"
        }
      },
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

  const workItems: AdminIncubationItem[] = works.map((work) => {
    const status = work.workIncubation?.status ?? WorkIncubationStatus.DISPLAYING;
    return {
      id: work.id,
      target: "work" as const,
      label: "孵化池管理",
      title: work.title,
      subtitle: `设计师：${work.user.nickname}`,
      summary: `${incubationStatusLabels[status]}。${getIncubationRuleText({
        likeCount: work.likeCount,
        favoriteCount: work.favoriteCount,
        presaleIntentCount: work._count.presaleIntents,
        buyerIntentCount: work._count.buyerIntents
      })}`,
      status,
      createdAt: formatDateTime(work.createdAt)
    };
  });

  const proposalItems: AdminIncubationItem[] = works.flatMap((work) => [
    ...work.presaleIntents.map((item) => ({
      id: item.id,
      target: "presale" as const,
      label: "预售意向管理",
      title: `${item.name} / ${work.title}`,
      contact: item.contact,
      summary: sentence([item.size && `尺码 ${item.size}`, item.color && `颜色 ${item.color}`, item.quantity && `数量 ${item.quantity}`, item.acceptablePrice && `价格 ${item.acceptablePrice}`, item.message]),
      status: item.status,
      createdAt: formatDateTime(item.createdAt)
    })),
    ...work.fabricProposals.map((item) => ({
      id: item.id,
      target: "fabric" as const,
      label: "面料推荐管理",
      title: `${item.fabricName} / ${work.title}`,
      subtitle: `${item.proposerName}${item.companyName ? ` / ${item.companyName}` : ""}`,
      contact: item.contact,
      summary: sentence([item.composition, item.weight, item.width, item.priceRange, item.reason, item.imageUrl]),
      status: item.status,
      createdAt: formatDateTime(item.createdAt)
    })),
    ...work.sampleProposals.map((item) => ({
      id: item.id,
      target: "sample" as const,
      label: "打样方案管理",
      title: `${item.proposerName} / ${work.title}`,
      subtitle: item.studioName ?? undefined,
      contact: item.contact,
      summary: sentence([item.serviceType, item.category, item.leadTime, item.priceRange, item.message]),
      status: item.status,
      createdAt: formatDateTime(item.createdAt)
    })),
    ...work.factoryProposals.map((item) => ({
      id: item.id,
      target: "factory" as const,
      label: "工厂方案管理",
      title: `${item.proposerName} / ${work.title}`,
      subtitle: item.factoryName ?? undefined,
      contact: item.contact,
      summary: sentence([item.category, item.moq && `起订量 ${item.moq}`, item.leadTime, item.unitPriceRange, item.message]),
      status: item.status,
      createdAt: formatDateTime(item.createdAt)
    })),
    ...work.buyerIntents.map((item) => ({
      id: item.id,
      target: "buyer" as const,
      label: "采购意向管理",
      title: `${item.buyerName} / ${work.title}`,
      subtitle: item.companyName ?? undefined,
      contact: item.contact,
      summary: sentence([item.channelType, item.quantity && `数量 ${item.quantity}`, item.targetPrice, item.cooperationType, item.message]),
      status: item.status,
      createdAt: formatDateTime(item.createdAt)
    }))
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">孵化与方案管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">
          查看孵化池、面料推荐、打样方案、工厂方案、采购意向和预售意向。后台负责规则和秩序，不替设计师完成合作决策。
        </p>
      </header>

      <div className="mb-5 rounded-[8px] border border-black/8 bg-white p-4 text-sm leading-6 text-ink/58">
        轻量候选规则：点赞 30、收藏 10、预售意向 20 或采购意向 3，满足任一条件即可建议进入孵化候选。
      </div>

      <AdminIncubationPanel items={[...proposalItems, ...workItems]} />
    </div>
  );
}
