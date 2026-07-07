import Link from "next/link";
import { redirect } from "next/navigation";
import { DesignerIncubationPanel, type DesignerIncubationItem } from "@/components/incubation/DesignerIncubationPanel";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/incubation";
import { prisma } from "@/lib/prisma";

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
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

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
            查看你发布的作品收到的预售意向、面料推荐、打样方案、工厂方案和采购意向，并决定是否采纳。
          </p>
        </div>
        <Link href="/me" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          返回我的页面
        </Link>
      </header>

      <DesignerIncubationPanel items={items} />
    </div>
  );
}
