import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderApplicationStatus } from "@prisma/client";
import { MyActivityLists, type MyFavoriteItem, type MyRequestItem } from "@/components/me/MyActivityLists";
import { MyWorksList, type MyWorkItem } from "@/components/me/MyWorksList";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnyProviderForUser, getProviderApplicationForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { SUPPLY_PROVIDER_TYPE_LABELS, providerCompleteness, providerPublicUrl } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

type MeTab = "works" | "progress" | "favorites" | "profile";

type MePageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

const tabs: Array<{ key: MeTab; label: string; href: string }> = [
  { key: "works", label: "我的作品", href: "/me?tab=works" },
  { key: "progress", label: "我的进展", href: "/me?tab=progress" },
  { key: "favorites", label: "我的收藏", href: "/me?tab=favorites" },
  { key: "profile", label: "账号与资料", href: "/me?tab=profile" }
];

const tabKeys = new Set<MeTab>(tabs.map((tab) => tab.key));

function getActiveTab(value?: string): MeTab {
  return value && tabKeys.has(value as MeTab) ? (value as MeTab) : "works";
}

function mapWork(work: { id: string; title: string; images: Array<{ imageUrl: string }> } | null) {
  return work
    ? {
        id: work.id,
        title: work.title,
        imageUrl: work.images[0]?.imageUrl
      }
    : null;
}

export default async function MePage({ searchParams }: MePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const params = await searchParams;
  const activeTab = getActiveTab(params?.tab);

  const [works, favorites, fabricRequests, sampleRequests, incubationApplications, provider, providerApplication] = await Promise.all([
    prisma.work.findMany({
      where: {
        userId: user.id
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        challengeEntries: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.favorite.findMany({
      where: {
        userId: user.id
      },
      include: {
        work: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            },
            user: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.fabricRequest.findMany({
      where: {
        userId: user.id
      },
      include: {
        work: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.sampleRequest.findMany({
      where: {
        userId: user.id
      },
      include: {
        work: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.incubationApplication.findMany({
      where: {
        userId: user.id
      },
      include: {
        work: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    getAnyProviderForUser(user),
    getProviderApplicationForUser(user)
  ]);

  const workItems: MyWorkItem[] = works.map((work) => ({
    id: work.id,
    title: work.title,
    reviewStatus: work.reviewStatus,
    rejectReason: work.rejectReason,
    createdAt: work.createdAt.toISOString(),
    isOpenCoop: work.isOpenCoop,
    wantsFabric: work.wantsFabric,
    wantsSample: work.wantsSample,
    wantsIncubation: work.wantsIncubation,
    images: work.images.map((image) => ({ imageUrl: image.imageUrl })),
    challengeEntries: work.challengeEntries.map((entry) => ({ id: entry.id }))
  }));
  const entryItems = workItems.filter((work) => work.challengeEntries.length > 0);
  const favoriteItems: MyFavoriteItem[] = favorites.map((favorite) => ({
    id: favorite.id,
    createdAt: favorite.createdAt.toISOString(),
    work: {
      id: favorite.work.id,
      title: favorite.work.title,
      imageUrl: favorite.work.images[0]?.imageUrl,
      authorName: favorite.work.user.nickname
    }
  }));
  const fabricItems: MyRequestItem[] = fabricRequests.map((request) => ({
    id: request.id,
    title: request.category ? `找面料：${request.category}` : "找面料申请",
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    adminNote: request.adminNote,
    work: mapWork(request.work)
  }));
  const sampleItems: MyRequestItem[] = sampleRequests.map((request) => ({
    id: request.id,
    title: request.garmentCategory ? `打样：${request.garmentCategory}` : "打样申请",
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    adminNote: request.adminNote,
    work: mapWork(request.work)
  }));
  const incubationItems: MyRequestItem[] = incubationApplications.map((application) => ({
    id: application.id,
    title: `孵化申请：${application.source}`,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
    adminNote: application.adminNote,
    work: mapWork(application.work)
  }));

  const [receivedPresaleCount, receivedFabricProposalCount, receivedSampleProposalCount, receivedFactoryProposalCount, receivedBuyerIntentCount, incubatingWorkCount] = await Promise.all([
    prisma.presaleIntent.count({ where: { work: { userId: user.id } } }),
    prisma.fabricProposal.count({ where: { work: { userId: user.id } } }),
    prisma.sampleProposal.count({ where: { work: { userId: user.id } } }),
    prisma.factoryProposal.count({ where: { work: { userId: user.id } } }),
    prisma.buyerIntent.count({ where: { work: { userId: user.id } } }),
    prisma.work.count({
      where: {
        userId: user.id,
        OR: [
          { workIncubation: { is: { status: { not: "DISPLAYING" } } } },
          { incubationStatus: { not: null } },
          { wantsIncubation: true }
        ]
      }
    })
  ]);
  const totalLikes = works.reduce((sum, work) => sum + work.likeCount, 0);
  const totalFavorites = works.reduce((sum, work) => sum + work.favoriteCount, 0);
  const totalComments = works.reduce((sum, work) => sum + work.commentCount, 0);

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 md:px-8 md:py-12">
      <header className="mb-5 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">我的</h1>
          <p className="mt-3 text-sm text-ink/58 md:mt-4">管理作品、进展、收藏和个人资料。</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Link href="/me/profile" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink sm:px-5">
            账号与资料
          </Link>
          {!provider ? (
            <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:px-5">
              发布作品
            </Link>
          ) : null}
        </div>
      </header>

      {provider ? (
        <section className="mb-5 rounded-[16px] bg-white p-5 md:p-7">
          <p className="text-sm text-ink/45">{SUPPLY_PROVIDER_TYPE_LABELS[provider.type]}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink md:text-4xl">{provider.name}</h2>
          <p className="mt-3 text-sm text-ink/52">服务商资料完成度 {providerCompleteness(provider).percent}%</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">进入服务商工作台</Link>
            <Link href={providerPublicUrl(provider)} className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">查看公开主页</Link>
          </div>
        </section>
      ) : providerApplication ? (
        <section className="mb-5 rounded-[16px] bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">
            {providerApplication.status === ProviderApplicationStatus.PENDING ? "服务商申请审核中" : providerApplication.status === ProviderApplicationStatus.REJECTED ? "服务商申请需要完善" : "服务商申请已通过"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">
            {providerApplication.status === ProviderApplicationStatus.PENDING
              ? "审核通过后可创建供应商主页和发布产品。"
              : providerApplication.reviewNote || "请根据平台反馈完善资料。"}
          </p>
          {providerApplication.status === ProviderApplicationStatus.REJECTED ? (
            <Link href="/providers/apply" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">重新完善申请</Link>
          ) : null}
        </section>
      ) : !user.personaCompleted ? (
        <section className="mb-5 rounded-[16px] bg-white p-5">
          <h2 className="text-xl font-semibold text-ink">选择你的身份</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">完成后会显示更适合你的个人入口。</p>
          <Link href="/me/onboarding" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">去选择身份</Link>
        </section>
      ) : null}

      {!provider ? <section className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["我的作品", works.length],
          ["总点赞", totalLikes],
          ["总收藏", totalFavorites],
          ["进行中", incubatingWorkCount + receivedPresaleCount + receivedFabricProposalCount + receivedSampleProposalCount + receivedFactoryProposalCount + receivedBuyerIntentCount]
        ].map(([label, value], index) => (
          <div key={label} className="rounded-[8px] border border-black/8 bg-white p-3">
            <p className="text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
          </div>
        ))}
      </section> : null}

      <div className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-2 md:mx-0 md:mb-6 md:px-0">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
              activeTab === tab.key ? "bg-ink text-white" : "bg-white text-ink/45 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "works" ? <MyWorksList works={workItems} /> : null}
      {activeTab === "progress" ? (
        <section className="grid gap-3 md:grid-cols-2">
          {[
            ["孵化进度", `${incubatingWorkCount} 件作品正在推进`, "/me/incubation"],
            ["参赛作品", `${entryItems.length} 件作品参加挑战`, "/challenges"],
            ["面料需求", `${fabricItems.length} 条记录`, "/me/incubation"],
            ["打样需求", `${sampleItems.length} 条记录`, "/me/incubation"],
            ["预售意向", `${receivedPresaleCount} 条收到的意向`, "/me/incubation"],
            ["合作方案", `${receivedSampleProposalCount + receivedFactoryProposalCount + receivedBuyerIntentCount} 条待查看`, "/me/incubation"]
          ].map(([title, description, href]) => (
            <Link key={title} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm text-ink/52">{description}</p>
            </Link>
          ))}
        </section>
      ) : null}
      {activeTab === "favorites" ? (
        <MyActivityLists
          activeTab="favorites"
          favorites={favoriteItems}
          fabricRequests={fabricItems}
          sampleRequests={sampleItems}
          incubationApplications={incubationItems}
        />
      ) : null}
      {activeTab === "profile" ? (
        <section className="grid gap-3 md:grid-cols-2">
          <Link href="/me/profile" className="rounded-[8px] border border-black/8 bg-white p-4">
            <h2 className="font-semibold text-ink">编辑个人资料</h2>
            <p className="mt-2 text-sm text-ink/52">更新昵称、学校、城市和个人介绍。</p>
          </Link>
          <Link href="/me/onboarding" className="rounded-[8px] border border-black/8 bg-white p-4">
            <h2 className="font-semibold text-ink">切换身份</h2>
            <p className="mt-2 text-sm text-ink/52">调整你在 RunwayLab 的个人工作台。</p>
          </Link>
          <Link href="/me/dashboard" className="rounded-[8px] border border-black/8 bg-white p-4">
            <h2 className="font-semibold text-ink">个人工作台</h2>
            <p className="mt-2 text-sm text-ink/52">查看与你身份相关的任务入口。</p>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
