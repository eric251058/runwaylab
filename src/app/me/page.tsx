import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MyWorksList, type MyWorkItem } from "@/components/me/MyWorksList";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const works = await prisma.work.findMany({
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
  });

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">My RunwayLab</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">我的页面</h1>
          <p className="mt-4 text-sm text-ink/58">先完成我的作品和审核状态，后续再扩展收藏、需求和孵化申请。</p>
        </div>
        <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          发布作品
        </Link>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {["我的作品", "我的参赛", "我的收藏", "面料需求", "打样需求", "孵化申请"].map((item, index) => (
          <span key={item} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${index === 0 ? "bg-ink text-white" : "bg-white text-ink/45"}`}>
            {item}
          </span>
        ))}
      </div>

      <MyWorksList works={items} />
    </div>
  );
}
