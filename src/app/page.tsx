import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeFeed, type HomeFeedWork } from "@/components/works/HomeFeed";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isPublicQualityWork } from "@/lib/works/rules";
import { attachWorkCardInteractionState, getPublicQualityWorkIds } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

const workInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  user: { include: { designerProfile: true } },
  school: true,
  teacher: true,
  teacherRecommendations: { take: 1 },
  challengeEntries: { take: 1 },
  workIncubation: true,
  _count: {
    select: {
      presaleIntents: true,
      fabricProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true,
      presaleCampaigns: true,
      fabricRecommendations: true,
      providerWorkProposals: true
    }
  }
};

async function getHomeWorks() {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return [];

  const works = await prisma.work.findMany({
    where: {
      id: {
        in: qualityWorkIds
      }
    },
    include: workInclude,
    orderBy: [{ isEditorPick: "desc" }, { isFeatured: "desc" }, { favoriteCount: "desc" }, { updatedAt: "desc" }],
    take: 36
  });

  return works.filter(isPublicQualityWork).slice(0, 6);
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const works = await getHomeWorks();
  const worksWithInteractions = await attachWorkCardInteractionState(works, currentUser?.id);
  const homeFeedWorks = worksWithInteractions as unknown as HomeFeedWork[];

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-10">
      <section className="grid min-h-[430px] items-center rounded-[8px] bg-ink px-5 py-10 text-white md:min-h-[540px] md:px-10 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">RunwayLab</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">把服装想法，做成真实产品</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base md:leading-7">
            连接设计、面料、打样、供应链与市场反馈，帮助新锐设计师和品牌主理人推进自己的第一件产品。
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link href="/start" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-ink">
              启动服装项目
            </Link>
            <Link href="/works" className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 px-6 text-sm font-semibold text-white">
              浏览新锐设计
            </Link>
            <Link href="/providers/join" className="inline-flex h-10 items-center justify-center text-sm font-semibold text-white/58 hover:text-white">
              我是服务商
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">精选作品</h2>
            <p className="mt-2 text-sm text-ink/52">首页只展示 6 个真实、完整的作品，不直接展开评论。</p>
          </div>
          <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
            查看全部 <ArrowRight size={15} />
          </Link>
        </div>
        <HomeFeed works={homeFeedWorks} commentPreviews={{}} mode="inspiration" isLoggedIn={Boolean(currentUser)} />
      </section>
    </main>
  );
}
