import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CaseStudyStatus, FabricStatus, OpportunityStage } from "@prisma/client";
import { WorkCard } from "@/components/works/WorkCard";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicProviderWhere, SUPPLY_PROVIDER_TYPE_LABELS } from "@/lib/supply-network";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import { attachWorkCardInteractionState, type WorkCardData } from "@/lib/works/queries";

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

function isUsableHomeWork(work: { title: string; description: string; images: unknown[] }) {
  const title = work.title.trim().toLowerCase();
  const description = work.description.trim();
  if (!work.images.length) return false;
  if (["a", "s", "ssss", "test", "测试", "demo"].includes(title)) return false;
  if (title.length < 3 || description.length < 16) return false;
  return true;
}

function asWorkCard(work: Awaited<ReturnType<typeof getHomeWorks>>[number]) {
  return work as unknown as WorkCardData;
}

async function getHomeWorks() {
  const works = await prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workInclude,
    orderBy: [{ isEditorPick: "desc" }, { isFeatured: "desc" }, { favoriteCount: "desc" }, { updatedAt: "desc" }],
    take: 18
  });

  return works.filter(isUsableHomeWork).slice(0, 6);
}

function fabricMeta(fabric: { composition?: string | null; weight?: string | null; width?: string | null }) {
  return [fabric.composition, fabric.weight, fabric.width].filter(Boolean).slice(0, 2).join(" · ") || "参数待补充";
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const [works, opportunityWorks, providers, fabrics, featuredCase] = await Promise.all([
    getHomeWorks(),
    prisma.work.findMany({
      where: {
        ...approvedVisibleWorkWhere,
        opportunityProfile: {
          adminApproved: true,
          stage: { not: OpportunityStage.DISPLAY_ONLY }
        }
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        user: true,
        opportunityProfile: true
      },
      orderBy: [{ isEditorPick: "desc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.provider.findMany({
      where: publicProviderWhere(),
      orderBy: [{ isFeatured: "desc" }, { isVerified: "desc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.fabric.findMany({
      where: { status: FabricStatus.ACTIVE },
      include: { provider: true },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.caseStudy.findFirst({
      where: { status: CaseStudyStatus.PUBLISHED },
      include: { work: true, provider: true, project: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    })
  ]);
  const worksWithInteractions = await attachWorkCardInteractionState(works, currentUser?.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-10">
      <section className="grid min-h-[420px] items-center rounded-[8px] bg-ink px-5 py-10 text-white md:min-h-[520px] md:px-10 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">RunwayLab</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">让设计作品真正被看见</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 md:text-base md:leading-7">
            发布作品，获得反馈，并连接面料、打样和生产资源。
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/publish" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-ink">
              发布作品
            </Link>
            <Link href="/works" className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 px-6 text-sm font-semibold text-white">
              浏览作品
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">精选作品</h2>
            <p className="mt-2 text-sm text-ink/52">先看已经被认真展示的设计。</p>
          </div>
          <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
            更多作品 <ArrowRight size={15} />
          </Link>
        </div>
        {worksWithInteractions.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {worksWithInteractions.map((work, index) => (
              <WorkCard key={work.id} work={asWorkCard(work)} index={index} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在筛选首批高质量作品。</div>
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">正在发生的机会</h2>
            <p className="mt-2 text-sm text-ink/52">这些作品正在靠近打样、预售或合作。</p>
          </div>
          <Link href="/providers/opportunities" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
            查看机会 <ArrowRight size={15} />
          </Link>
        </div>
        {opportunityWorks.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {opportunityWorks.map((work, index) => (
              <Link key={work.id} href={`/works/${work.id}`} className="overflow-hidden rounded-[8px] border border-black/8 bg-white transition hover:border-ink/30">
                <img src={visualFor(index, work.images[0]?.imageUrl)} alt={work.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base font-semibold text-ink">{work.title}</h3>
                  <p className="mt-2 truncate text-sm text-ink/50">{work.user.nickname}</p>
                  <p className="mt-3 text-sm leading-6 text-ink/55">已有资源方可判断的合作线索。</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">机会池正在积累中，可以先发布作品或浏览作品库。</div>
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-ink md:text-3xl">面料与服务资源</h2>
          <p className="mt-2 text-sm text-ink/52">为作品寻找下一步所需的真实资源。</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">面料</h3>
              <Link href="/fabrics" className="text-sm font-semibold text-ink/45 hover:text-ink">更多</Link>
            </div>
            <div className="space-y-2">
              {fabrics.length ? fabrics.map((fabric) => (
                <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="flex min-h-14 items-center gap-3 rounded-[6px] p-2 hover:bg-paper">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/60">料</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{fabric.name}</span>
                    <span className="mt-1 block truncate text-xs text-ink/45">{fabricMeta(fabric)}</span>
                  </span>
                </Link>
              )) : <p className="rounded-[6px] bg-paper p-4 text-sm text-ink/52">面料库正在补充中。</p>}
            </div>
          </div>
          <div className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">服务商</h3>
              <Link href="/providers" className="text-sm font-semibold text-ink/45 hover:text-ink">更多</Link>
            </div>
            <div className="space-y-2">
              {providers.length ? providers.map((provider) => (
                <Link key={provider.id} href={`/providers/${provider.slug ?? provider.id}`} className="flex min-h-14 items-center gap-3 rounded-[6px] p-2 hover:bg-paper">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/60">商</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{provider.name}</span>
                    <span className="mt-1 block truncate text-xs text-ink/45">{[provider.city, SUPPLY_PROVIDER_TYPE_LABELS[provider.type]].filter(Boolean).join(" · ") || "服务信息待补充"}</span>
                  </span>
                </Link>
              )) : <p className="rounded-[6px] bg-paper p-4 text-sm text-ink/52">服务商资源正在补充中。</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[8px] border border-black/8 bg-white p-5 md:mt-12 md:p-7">
        <h2 className="text-2xl font-semibold text-ink md:text-3xl">合作案例</h2>
        {featuredCase ? (
          <div className="mt-4 max-w-3xl">
            <h3 className="text-lg font-semibold text-ink">{featuredCase.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/58">
              RunwayLab 会把作品、资源和合作记录放在同一条路径里，帮助双方更快判断是否继续推进。
            </p>
            <Link href="/cases" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
              查看案例
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink/58">平台正在积累首批孵化案例。</p>
        )}
      </section>
    </main>
  );
}
