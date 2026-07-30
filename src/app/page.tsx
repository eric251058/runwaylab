import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CaseStudyStatus, ContentStatus, FabricStatus, OpportunityStage } from "@prisma/client";
import { HomeFeed, type FeedCommentPreview, type HomeFeedWork } from "@/components/works/HomeFeed";
import { visualFor } from "@/components/works/work-visuals";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicProviderWhere, SUPPLY_PROVIDER_TYPE_LABELS } from "@/lib/supply-network";
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

  return works.filter(isPublicQualityWork).slice(0, 12);
}

async function getHomeCommentPreviews(workIds: string[]) {
  if (!workIds.length) return {};
  const comments = await prisma.comment.findMany({
    where: {
      workId: { in: workIds },
      status: ContentStatus.VISIBLE
    },
    select: {
      id: true,
      workId: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          nickname: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: workIds.length * 6
  });

  return comments.reduce<Record<string, FeedCommentPreview[]>>((groups, comment) => {
    const current = groups[comment.workId] ?? [];
    if (current.length < 2) {
      groups[comment.workId] = [
        ...current,
        {
          id: comment.id,
          workId: comment.workId,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          user: {
            nickname: comment.user.nickname
          }
        }
      ];
    }
    return groups;
  }, {});
}

type HomePageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

function fabricMeta(fabric: { composition?: string | null; weight?: string | null; width?: string | null }) {
  return [fabric.composition, fabric.weight, fabric.width].filter(Boolean).slice(0, 2).join(" · ") || "参数待补充";
}

function feedMode(value: string | undefined, isLoggedIn: boolean): "inspiration" | "activity" {
  if (value === "activity") return "activity";
  if (value === "inspiration") return "inspiration";
  return isLoggedIn ? "activity" : "inspiration";
}

function Step({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/52">{description}</p>
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const currentUser = await getCurrentUser();
  const params = await searchParams;
  const activeFeedMode = feedMode(params?.view, Boolean(currentUser));
  const qualityWorkIds = await getPublicQualityWorkIds();
  const qualityWorkIdList = qualityWorkIds.length ? qualityWorkIds : ["__no_public_quality_work__"];
  const [works, opportunityWorks, providers, fabrics, featuredCase] = await Promise.all([
    getHomeWorks(),
    prisma.work.findMany({
      where: {
        id: {
          in: qualityWorkIdList
        },
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
  const homeFeedWorks = worksWithInteractions as unknown as HomeFeedWork[];
  const commentPreviews = activeFeedMode === "activity" ? await getHomeCommentPreviews(homeFeedWorks.map((work) => work.id)) : {};
  const qualityOpportunityWorks = opportunityWorks.filter(isPublicQualityWork);

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
            <Link href="/providers/apply" className="inline-flex h-10 items-center justify-center text-sm font-semibold text-white/58 hover:text-white">
              我是服务商
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-ink md:text-3xl">两种开始方式</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/52">不需要一次写完整计划。先选择你现在拥有的起点，再逐步补充。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/start?source=design" className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
            <h3 className="text-xl font-semibold text-ink">我有设计作品</h3>
            <p className="mt-2 text-sm leading-6 text-ink/55">适合已经有设计稿、样衣图或作品页面，希望继续推进面料、打样或合作的人。</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink">启动项目 <ArrowRight className="h-4 w-4" /></span>
          </Link>
          <Link href="/start?source=idea" className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
            <h3 className="text-xl font-semibold text-ink">我有产品想法</h3>
            <p className="mt-2 text-sm leading-6 text-ink/55">适合还没有完整设计稿，但已经想推进一件服装产品或小品牌方向的人。</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink">启动项目 <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">真实作品发现</h2>
            <p className="mt-2 text-sm text-ink/52">{activeFeedMode === "activity" ? "沉浸浏览作品、评论和互动。" : "快速发现更多值得停留的设计。"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-white p-1 text-sm font-semibold shadow-[0_10px_30px_rgba(16,16,16,0.06)]" aria-label="首页浏览模式">
              <Link href="/?view=inspiration" className={`rounded-full px-4 py-2 ${activeFeedMode === "inspiration" ? "bg-ink text-white" : "text-ink/55 hover:text-ink"}`}>灵感</Link>
              <Link href="/?view=activity" className={`rounded-full px-4 py-2 ${activeFeedMode === "activity" ? "bg-ink text-white" : "text-ink/55 hover:text-ink"}`}>动态</Link>
            </div>
            <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
              更多作品 <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <HomeFeed works={homeFeedWorks} commentPreviews={commentPreviews} mode={activeFeedMode} isLoggedIn={Boolean(currentUser)} />
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-ink md:text-3xl">RunwayLab 如何推进项目</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/52">先记录起点，再根据真实进展进入作品、打样、合作或市场反馈路径。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Step title="启动项目" description="用一句话记录产品方向。" />
          <Step title="补充资料" description="逐步明确定位、场景和价格带。" />
          <Step title="连接资源" description="需要时再进入面料、打样或供应链。" />
          <Step title="验证反馈" description="用真实互动判断是否继续推进。" />
        </div>
      </section>

      {qualityOpportunityWorks.length ? (
        <section className="mt-10 md:mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink md:text-3xl">真实推进中的项目</h2>
              <p className="mt-2 text-sm text-ink/52">只展示已有真实机会信号的作品。</p>
            </div>
            <Link href="/providers/opportunities" className="hidden items-center gap-1 text-sm font-semibold text-ink/55 hover:text-ink sm:inline-flex">
              查看机会 <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {qualityOpportunityWorks.map((work, index) => (
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
        </section>
      ) : null}

      {featuredCase ? (
        <section className="mt-10 rounded-[8px] border border-black/8 bg-white p-5 md:mt-12 md:p-7">
          <h2 className="text-2xl font-semibold text-ink md:text-3xl">真实案例</h2>
          <div className="mt-4 max-w-3xl">
            <h3 className="text-lg font-semibold text-ink">{featuredCase.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/58">
              RunwayLab 会把作品、资源和合作记录放在同一条路径里，帮助双方更快判断是否继续推进。
            </p>
            <Link href="/cases" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
              查看案例
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-10 md:mt-12">
        <div className="rounded-[8px] border border-black/8 bg-white p-5 md:p-7">
          <h2 className="text-2xl font-semibold text-ink md:text-3xl">RunwayLab 首批品牌主理人计划</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/58">
            有设计、有产品想法、有客户或正在启动品牌，都可以先从一个项目开始。不需要完整商业计划，先告诉我们你现在有什么，以及下一步最需要什么。
          </p>
          <Link href="/start" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            启动我的项目
          </Link>
        </div>
      </section>

      {(fabrics.length || providers.length) ? (
        <section className="mt-10 md:mt-12">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">面料与服务商</h2>
            <p className="mt-2 text-sm text-ink/52">为作品寻找下一步所需的真实服务商支持。</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {fabrics.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">面料</h3>
                  <Link href="/fabrics" className="text-sm font-semibold text-ink/45 hover:text-ink">更多</Link>
                </div>
                <div className="space-y-2">
                  {fabrics.map((fabric) => (
                    <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="flex min-h-14 items-center gap-3 rounded-[6px] p-2 hover:bg-paper">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/60">料</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{fabric.name}</span>
                        <span className="mt-1 block truncate text-xs text-ink/45">{fabricMeta(fabric)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {providers.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">服务商</h3>
                  <Link href="/providers" className="text-sm font-semibold text-ink/45 hover:text-ink">更多</Link>
                </div>
                <div className="space-y-2">
                  {providers.map((provider) => (
                    <Link key={provider.id} href={`/providers/${provider.slug ?? provider.id}`} className="flex min-h-14 items-center gap-3 rounded-[6px] p-2 hover:bg-paper">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/60">商</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{provider.name}</span>
                        <span className="mt-1 block truncate text-xs text-ink/45">{[provider.city, SUPPLY_PROVIDER_TYPE_LABELS[provider.type]].filter(Boolean).join(" · ") || "服务信息待补充"}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
