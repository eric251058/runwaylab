import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Factory, GraduationCap, Scissors, Shirt, Sparkles, SwatchBook, Users } from "lucide-react";
import { ChallengeStatus, ExhibitionStatus, WorkIncubationStatus } from "@prisma/client";
import { DesignerCard } from "@/components/designer/DesignerCard";
import { WorkCard } from "@/components/works/WorkCard";
import { visualFor } from "@/components/works/work-visuals";
import { getHeatScore } from "@/lib/operation-growth";
import { prisma } from "@/lib/prisma";
import { displayDateRange, schoolCoverUrl, teacherAvatarUrl } from "@/lib/school-activity";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import type { RecommendedDesigner, WorkCardData } from "@/lib/works/queries";

export const dynamic = "force-dynamic";

const workInclude = {
  images: {
    orderBy: {
      sortOrder: "asc" as const
    }
  },
  user: {
    include: {
      designerProfile: true
    }
  },
  challengeEntries: {
    include: {
      challenge: true
    },
    take: 1
  },
  incubationProjects: {
    orderBy: {
      createdAt: "desc" as const
    },
    take: 1
  },
  incubationApplications: {
    take: 1
  },
  workIncubation: true,
  _count: {
    select: {
      presaleIntents: true,
      fabricProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true
    }
  }
};

type HomeWork = Awaited<ReturnType<typeof getHomeWorks>>[number];

async function getHomeWorks() {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workInclude,
    orderBy: [{ createdAt: "desc" }],
    take: 60
  });
}

function heatOf(work: HomeWork) {
  return getHeatScore({
    likeCount: work.likeCount,
    favoriteCount: work.favoriteCount,
    commentCount: work.commentCount,
    presaleIntentCount: work._count.presaleIntents,
    fabricProposalCount: work._count.fabricProposals,
    sampleProposalCount: work._count.sampleProposals,
    factoryProposalCount: work._count.factoryProposals,
    buyerIntentCount: work._count.buyerIntents
  });
}

function asWorkCard(work: HomeWork) {
  return work as unknown as WorkCardData;
}

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

function EntryCard({ icon, title, href }: { icon: ReactNode; title: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[8px] border border-black/8 bg-white p-4 text-sm font-semibold text-ink transition hover:border-ink/35">
      <span className="flex size-10 items-center justify-center rounded-full bg-paper">{icon}</span>
      {title}
    </Link>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">{text}</div>;
}

export default async function HomePage() {
  const [works, designerProfiles, userCount, presaleCount, proposalCounts, featuredSchools, featuredTeachers, featuredExhibitions, featuredChallenges] = await Promise.all([
    getHomeWorks(),
    prisma.designerProfile.findMany({
      include: {
        user: {
          include: {
            _count: {
              select: {
                works: {
                  where: approvedVisibleWorkWhere
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.user.count(),
    prisma.presaleIntent.count(),
    Promise.all([
      prisma.fabricProposal.count(),
      prisma.sampleProposal.count(),
      prisma.factoryProposal.count(),
      prisma.buyerIntent.count()
    ]),
    prisma.school.findMany({
      where: { status: "ACTIVE" },
      include: { _count: { select: { teachers: true, works: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      include: { school: true, _count: { select: { recommendations: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.exhibition.findMany({
      where: { OR: [{ status: ExhibitionStatus.PUBLISHED }, { isFeatured: true }] },
      include: { school: true, teacher: true, _count: { select: { works: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.challenge.findMany({
      where: { OR: [{ status: { in: [ChallengeStatus.PUBLISHED, ChallengeStatus.ACTIVE] } }, { isFeatured: true }] },
      include: { school: true, teacher: true, _count: { select: { works: true, entries: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    })
  ]);

  const [fabricProposalCount, sampleProposalCount, factoryProposalCount, buyerIntentCount] = proposalCounts;
  const hotWorks = works.slice().sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 6);
  const featuredWorks = works.filter((work) => work.isFeatured || work.isEditorPick).concat(hotWorks).filter((work, index, array) => array.findIndex((item) => item.id === work.id) === index).slice(0, 6);
  const incubationWorks = works
    .filter((work) => work.workIncubation && work.workIncubation.status !== WorkIncubationStatus.DISPLAYING)
    .concat(works.filter((work) => work.wantsIncubation || work.incubationStatus))
    .filter((work, index, array) => array.findIndex((item) => item.id === work.id) === index)
    .slice(0, 6);
  const latestOpportunity = works.find((work) => work._count.fabricProposals + work._count.sampleProposals + work._count.factoryProposals + work._count.buyerIntents > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="grid gap-8 md:grid-cols-[0.92fr_1.08fr] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">RunwayLab</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink md:text-6xl">发布你的服装设计作品，让作品被看见、被孵化、被生产。</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-ink/62 md:text-base md:leading-7">
            RunwayLab 连接设计师、院校、面料商、打样工作室、工厂、买手和采购商，让服装设计从展示走向面料、打样、生产和采购机会。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/publish" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white">
              发布作品
            </Link>
            <Link href="/incubation" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-ink">
              查看孵化池
            </Link>
            <Link href="/partners" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-ink">
              合作方入口
            </Link>
          </div>
        </div>

        {hotWorks[0] ? (
          <Link href={`/works/${hotWorks[0].id}`} className="group relative overflow-hidden rounded-[8px] bg-zinc-200 shadow-[0_24px_80px_rgba(16,16,16,0.14)]">
            <img src={visualFor(0, hotWorks[0].images[0])} alt={hotWorks[0].title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105 md:aspect-[5/4]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-5 text-white">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">热度 {heatOf(hotWorks[0])}</span>
              <h2 className="mt-3 text-2xl font-semibold">{hotWorks[0].title}</h2>
              <p className="mt-2 text-sm text-white/70">{hotWorks[0].user.nickname}</p>
            </div>
          </Link>
        ) : (
          <EmptyBlock text="暂无作品。发布第一件作品后，首页会自动展示真实数据。" />
        )}
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <EntryCard href="/publish" title="我是设计师" icon={<Shirt size={18} />} />
        <EntryCard href="/challenges" title="我是老师 / 学校" icon={<GraduationCap size={18} />} />
        <EntryCard href="/partners" title="我是面料商" icon={<SwatchBook size={18} />} />
        <EntryCard href="/partners" title="我是打样 / 工厂" icon={<Scissors size={18} />} />
        <EntryCard href="/partners" title="我是买手 / 采购商" icon={<Factory size={18} />} />
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stat("作品数量", works.length)}
        {stat("用户数量", userCount)}
        {stat("孵化候选数量", incubationWorks.length)}
        {stat("预售意向数量", presaleCount)}
        {stat("合作方案数量", fabricProposalCount + sampleProposalCount + factoryProposalCount + buyerIntentCount)}
      </section>

      <div className="mt-12 space-y-12">
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Campus</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">学校 / 老师 / 活动</h2>
            </div>
            <Link href="/schools" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
              查看院校
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">推荐学校</h3>
                <Link href="/schools" className="text-xs font-semibold text-ink/45">更多</Link>
              </div>
              <div className="space-y-3">
                {featuredSchools.length ? featuredSchools.map((school) => (
                  <Link key={school.id} href={`/schools/${school.slug ?? school.id}`} className="flex gap-3">
                    <img src={schoolCoverUrl(school.coverUrl ?? school.logoUrl)} alt={school.name} className="size-14 rounded-[6px] object-cover" />
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-semibold text-ink">{school.name}</span>
                      <span className="mt-1 block text-xs text-ink/45">{school.city ?? "城市待补充"} / {school._count.works} 件作品</span>
                    </span>
                  </Link>
                )) : <p className="text-sm text-ink/52">暂无学校数据</p>}
              </div>
            </div>
            <div className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">推荐老师</h3>
                <Link href="/teachers" className="text-xs font-semibold text-ink/45">更多</Link>
              </div>
              <div className="space-y-3">
                {featuredTeachers.length ? featuredTeachers.map((teacher) => (
                  <Link key={teacher.id} href={`/teachers/${teacher.slug ?? teacher.id}`} className="flex gap-3">
                    <img src={teacherAvatarUrl(teacher.avatarUrl)} alt={teacher.name} className="size-14 rounded-full object-cover" />
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-semibold text-ink">{teacher.name}</span>
                      <span className="mt-1 block text-xs text-ink/45">{teacher.school?.name ?? "学校待关联"} / 推荐 {teacher._count.recommendations}</span>
                    </span>
                  </Link>
                )) : <p className="text-sm text-ink/52">暂无老师数据</p>}
              </div>
            </div>
            <div className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">课程作品展</h3>
                <Link href="/exhibitions" className="text-xs font-semibold text-ink/45">更多</Link>
              </div>
              <div className="space-y-3">
                {featuredExhibitions.length ? featuredExhibitions.map((exhibition) => (
                  <Link key={exhibition.id} href={`/exhibitions/${exhibition.slug ?? exhibition.id}`} className="block rounded-[6px] bg-paper p-3">
                    <span className="line-clamp-1 text-sm font-semibold text-ink">{exhibition.title}</span>
                    <span className="mt-1 block text-xs text-ink/45">{displayDateRange(exhibition.startDate, exhibition.endDate)} / {exhibition._count.works} 件作品</span>
                  </Link>
                )) : <p className="text-sm text-ink/52">暂无作品展</p>}
              </div>
            </div>
            <div className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">设计挑战赛</h3>
                <Link href="/challenges" className="text-xs font-semibold text-ink/45">更多</Link>
              </div>
              <div className="space-y-3">
                {featuredChallenges.length ? featuredChallenges.map((challenge) => (
                  <Link key={challenge.id} href={`/challenges/${challenge.slug ?? challenge.id}`} className="block rounded-[6px] bg-paper p-3">
                    <span className="line-clamp-1 text-sm font-semibold text-ink">{challenge.title}</span>
                    <span className="mt-1 block text-xs text-ink/45">{challenge.theme} / {challenge._count.works + challenge._count.entries} 件作品</span>
                  </Link>
                )) : <p className="text-sm text-ink/52">暂无挑战赛</p>}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Featured</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">精选作品</h2>
            </div>
            <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
              查看作品库 <ArrowRight size={15} />
            </Link>
          </div>
          {featuredWorks.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
              {featuredWorks.map((work, index) => (
                <WorkCard key={work.id} work={asWorkCard(work)} index={index} compact />
              ))}
            </div>
          ) : (
            <EmptyBlock text="暂无精选作品。后台设置推荐或作品产生热度后会自动出现。" />
          )}
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Incubating</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">孵化中作品</h2>
            </div>
            <Link href="/incubation" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
              进入孵化池 <ArrowRight size={15} />
            </Link>
          </div>
          {incubationWorks.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
              {incubationWorks.map((work, index) => (
                <WorkCard key={work.id} work={asWorkCard(work)} index={index + 4} compact />
              ))}
            </div>
          ) : (
            <EmptyBlock text="暂无孵化中作品。达到热度规则或后台设置后会进入这里。" />
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[8px] bg-ink p-6 text-white md:p-8">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              <Sparkles size={14} />
              Latest Opportunity
            </div>
            <h2 className="mt-3 text-2xl font-semibold md:text-3xl">最新合作机会</h2>
            {latestOpportunity ? (
              <div className="mt-5">
                <p className="text-lg font-semibold">{latestOpportunity.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  已收到 {latestOpportunity._count.fabricProposals} 条面料推荐、{latestOpportunity._count.sampleProposals} 条打样方案、
                  {latestOpportunity._count.factoryProposals} 条工厂方案、{latestOpportunity._count.buyerIntents} 条采购意向。
                </p>
                <Link href={`/works/${latestOpportunity.id}`} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink">
                  查看作品
                </Link>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-white/60">暂无合作方案提交。合作方提交后会在这里展示最新机会。</p>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} />
              <h2 className="text-2xl font-semibold text-ink">热门设计师</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {designerProfiles.length ? designerProfiles.slice(0, 4).map((designer, index) => <DesignerCard key={designer.id} designer={designer as RecommendedDesigner} index={index} />) : <EmptyBlock text="暂无设计师资料。" />}
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-black/8 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">
                <BarChart3 size={14} />
                Rankings
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-ink">查看热度、预售、采购和新锐设计师榜单</h2>
            </div>
            <Link href="/rankings" className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
              进入排行榜
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
