import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminWorksPanel, type AdminWorkItem } from "@/components/admin/AdminWorksPanel";

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
      challengeEntries: true
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
  }).map((work) => ({
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
    createdAt: work.createdAt.toISOString(),
    user: {
      nickname: work.user.nickname,
      email: work.user.email
    },
    images: work.images.map((image) => ({ imageUrl: image.imageUrl })),
    challengeEntries: work.challengeEntries.map((entry) => ({ id: entry.id }))
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">作品审核</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">审核通过后，作品才会进入首页、作品库、挑战作品流和排行榜。</p>
      </header>
      <AdminWorksPanel works={items} />
    </div>
  );
}
