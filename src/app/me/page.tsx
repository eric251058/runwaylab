import Link from "next/link";
import { redirect } from "next/navigation";
import { MyActivityLists, type MyActivityTab, type MyFavoriteItem, type MyRequestItem } from "@/components/me/MyActivityLists";
import { MyWorksList, type MyWorkItem } from "@/components/me/MyWorksList";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MeTab = "works" | "entries" | MyActivityTab;

type MePageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

const tabs: Array<{ key: MeTab; label: string; href: string }> = [
  { key: "works", label: "我的作品", href: "/me?tab=works" },
  { key: "entries", label: "我的参赛", href: "/me?tab=entries" },
  { key: "favorites", label: "我的收藏", href: "/me?tab=favorites" },
  { key: "fabric", label: "面料需求", href: "/me?tab=fabric" },
  { key: "sample", label: "打样需求", href: "/me?tab=sample" },
  { key: "incubation", label: "孵化申请", href: "/me?tab=incubation" }
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

  const [works, favorites, fabricRequests, sampleRequests, incubationApplications] = await Promise.all([
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
    })
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

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 md:px-8 md:py-12">
      <header className="mb-5 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/40 md:text-xs">My RunwayLab</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">我的页面</h1>
          <p className="mt-4 text-sm text-ink/58">查看我的作品、收藏、需求申请和孵化进度。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/me/profile" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
            编辑个人资料
          </Link>
          <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            发布作品
          </Link>
        </div>
      </header>

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
      {activeTab === "entries" ? (
        <MyWorksList works={entryItems} emptyText="你还没有参加挑战" emptyActionHref="/challenges" emptyActionLabel="查看挑战" />
      ) : null}
      {activeTab !== "works" && activeTab !== "entries" ? (
        <MyActivityLists
          activeTab={activeTab}
          favorites={favoriteItems}
          fabricRequests={fabricItems}
          sampleRequests={sampleItems}
          incubationApplications={incubationItems}
        />
      ) : null}
    </div>
  );
}
