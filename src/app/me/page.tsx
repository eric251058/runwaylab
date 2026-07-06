import Link from "next/link";
import { redirect } from "next/navigation";
import { MyActivityLists, type MyFavoriteItem, type MyRequestItem } from "@/components/me/MyActivityLists";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MyWorksList, type MyWorkItem } from "@/components/me/MyWorksList";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const [works, favorites, fabricRequests, sampleRequests, cooperationRequests, incubationApplications] = await Promise.all([
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
    prisma.cooperationRequest.findMany({
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

  const items: MyWorkItem[] = works.map((work) => ({
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
  const mapWork = (work: { id: string; title: string; images: Array<{ imageUrl: string }> } | null) =>
    work
      ? {
          id: work.id,
          title: work.title,
          imageUrl: work.images[0]?.imageUrl
        }
      : null;
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
  const cooperationItems: MyRequestItem[] = cooperationRequests.map((request) => ({
    id: request.id,
    title: `合作意向：${request.type}`,
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
        {["我的作品", "我的参赛", "我的收藏", "面料需求", "打样需求", "孵化申请"].map((item, index) => (
          <span key={item} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${index === 0 ? "bg-ink text-white" : "bg-white text-ink/45"}`}>
            {item}
          </span>
        ))}
      </div>

      <MyWorksList works={items} />
      <MyActivityLists
        favorites={favoriteItems}
        fabricRequests={fabricItems}
        sampleRequests={sampleItems}
        cooperationRequests={cooperationItems}
        incubationApplications={incubationItems}
      />
    </div>
  );
}
