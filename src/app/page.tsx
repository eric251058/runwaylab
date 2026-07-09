import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Factory, GraduationCap, Scissors, Shirt, Sparkles, SwatchBook, Users } from "lucide-react";
import {
  CaseStudyStatus,
  CollaborationProjectStatus,
  FabricStatus,
  PresaleCampaignStatus,
  ProviderStatus,
  WorkIncubationStatus
} from "@prisma/client";
import { WorkCard } from "@/components/works/WorkCard";
import { visualFor } from "@/components/works/work-visuals";
import { getHeatScore } from "@/lib/operation-growth";
import { presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { fabricCoverUrl, providerLogoUrl, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";
import { schoolCoverUrl, teacherAvatarUrl } from "@/lib/school-activity";
import { approvedVisibleWorkWhere } from "@/lib/works/rules";
import type { WorkCardData } from "@/lib/works/queries";

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
  school: true,
  teacher: true,
  teacherRecommendations: {
    take: 1
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
      buyerIntents: true,
      presaleCampaigns: true,
      fabricRecommendations: true,
      providerWorkProposals: true
    }
  }
};

const roleCards = [
  {
    title: "设计师 / 学生",
    description: "发布作品，进入孵化机会池。",
    href: "/publish",
    action: "发布作品",
    icon: <Shirt size={18} />
  },
  {
    title: "老师 / 学校",
    description: "推荐作品，组织展览和挑战赛。",
    href: "/schools",
    action: "查看学校与老师",
    icon: <GraduationCap size={18} />
  },
  {
    title: "面料商 / 打样 / 工厂",
    description: "为作品提供面料、打样和生产方案。",
    href: "/providers/apply",
    action: "服务商入驻",
    icon: <SwatchBook size={18} />
  },
  {
    title: "买手 / 采购商",
    description: "发现新锐作品，提交采购意向。",
    href: "/presale",
    action: "查看预售验证",
    icon: <Factory size={18} />
  },
  {
    title: "普通用户",
    description: "浏览作品，提交预售意向。",
    href: "/works",
    action: "浏览作品",
    icon: <Users size={18} />
  }
];

const flowSteps = [
  { title: "发布作品", description: "设计师上传作品，建立公开作品页。" },
  { title: "老师推荐", description: "老师和学校把优秀作品推到更多人面前。" },
  { title: "面料推荐", description: "面料商围绕作品提交可落地的面料方案。" },
  { title: "打样方案", description: "打样工作室和工厂给出周期与报价参考。" },
  { title: "预售验证", description: "用户和买手表达兴趣，验证真实需求。" },
  { title: "合作项目", description: "设计师选择合适方案，推进商业合作。" }
];

const ruleLinks = [
  { label: "平台规则", href: "/legal/terms" },
  { label: "隐私政策", href: "/legal/privacy" },
  { label: "版权规则", href: "/legal/copyright" },
  { label: "预售规则", href: "/legal/presale-rules" },
  { label: "合作规则", href: "/legal/collaboration-rules" }
];

async function getHomeWorks() {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workInclude,
    orderBy: [{ createdAt: "desc" }],
    take: 60
  });
}

type HomeWork = Awaited<ReturnType<typeof getHomeWorks>>[number];

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

function dedupeWorks(works: HomeWork[]) {
  return works.filter((work, index, array) => array.findIndex((item) => item.id === work.id) === index);
}

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyBlock({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`rounded-[8px] border border-black/8 bg-white text-sm text-ink/55 ${compact ? "p-4" : "p-6"}`}>{text}</div>;
}

function RoleCard({ card }: { card: (typeof roleCards)[number] }) {
  return (
    <Link href={card.href} className="group flex min-h-[150px] flex-col justify-between rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
      <span>
        <span className="flex size-10 items-center justify-center rounded-full bg-paper text-ink">{card.icon}</span>
        <span className="mt-4 block text-base font-semibold text-ink">{card.title}</span>
        <span className="mt-2 block text-sm leading-6 text-ink/58">{card.description}</span>
      </span>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink/60 group-hover:text-ink">
        {card.action}
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function FlowStep({ step, index }: { step: (typeof flowSteps)[number]; index: number }) {
  return (
    <div className="min-w-[190px] flex-1 rounded-[8px] border border-black/8 bg-white p-4">
      <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{index + 1}</span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{step.title}</h3>
      <p className="mt-2 text-xs leading-5 text-ink/55">{step.description}</p>
    </div>
  );
}

function CompactAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}

export default async function HomePage() {
  const [
    works,
    featuredSchools,
    featuredTeachers,
    featuredProviders,
    featuredFabrics,
    activePresaleCampaigns,
    featuredProjects,
    featuredCases
  ] = await Promise.all([
    getHomeWorks(),
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
    prisma.provider.findMany({
      where: { status: ProviderStatus.ACTIVE },
      include: { _count: { select: { fabrics: true, workProposals: true } } },
      orderBy: [{ isFeatured: "desc" }, { isVerified: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.fabric.findMany({
      where: { status: FabricStatus.ACTIVE },
      include: { provider: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.presaleCampaign.findMany({
      where: { status: PresaleCampaignStatus.ACTIVE, work: approvedVisibleWorkWhere },
      include: {
        work: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            user: true
          }
        }
      },
      orderBy: [{ isFeatured: "desc" }, { currentCount: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.collaborationProject.findMany({
      where: { status: { notIn: [CollaborationProjectStatus.DRAFT, CollaborationProjectStatus.CANCELLED] } },
      include: { work: true, provider: true, _count: { select: { orders: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 3
    }),
    prisma.caseStudy.findMany({
      where: { status: CaseStudyStatus.PUBLISHED },
      include: { project: true, provider: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3
    })
  ]);

  const hotWorks = works.slice().sort((a, b) => heatOf(b) - heatOf(a));
  const incubationWorks = works.filter((work) => {
    return (
      work.workIncubation?.status === WorkIncubationStatus.CANDIDATE ||
      work.workIncubation?.status === WorkIncubationStatus.FABRIC_MATCHING ||
      work.workIncubation?.status === WorkIncubationStatus.SAMPLE_MATCHING ||
      work.workIncubation?.status === WorkIncubationStatus.PRODUCTION_MATCHING ||
      work.workIncubation?.status === WorkIncubationStatus.PRESALE_TESTING ||
      work.workIncubation?.status === WorkIncubationStatus.COLLABORATION_REACHED ||
      work.wantsIncubation ||
      Boolean(work.incubationStatus)
    );
  });
  const featuredWorks = dedupeWorks([
    ...works.filter((work) => work.isEditorPick),
    ...works.filter((work) => work.isFeatured),
    ...hotWorks,
    ...incubationWorks
  ]).slice(0, 6);

  const hasResources = featuredSchools.length || featuredTeachers.length || featuredProviders.length || featuredFabrics.length;
  const hasCasesOrProjects = featuredProjects.length || featuredCases.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-10">
      <section className="rounded-[8px] bg-ink px-5 py-8 text-white md:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">RunwayLab</p>
        <h1 className="mt-3 line-clamp-3 max-w-4xl text-3xl font-semibold leading-tight md:mt-4 md:line-clamp-none md:text-6xl">让服装设计作品，从作业走向打样、预售和商业合作。</h1>
        <p className="mt-4 line-clamp-3 max-w-3xl text-sm leading-6 text-white/68 md:mt-5 md:line-clamp-none md:text-base md:leading-7">
          连接设计学生、老师、院校、面料商、打样工作室、工厂与买手，帮助优秀作品完成从展示到孵化验证的第一步。
        </p>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap md:mt-7">
          <Link href="/publish" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-ink">
            发布作品
          </Link>
          <Link href="/works" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white">
            浏览作品
          </Link>
          <Link href="/providers/apply" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white/82">
            服务商入驻
          </Link>
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="精选作品" eyebrow="Featured Works" action={<CompactAction href="/works">浏览作品库</CompactAction>} />
        {featuredWorks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {featuredWorks.map((work, index) => (
              <div key={work.id} className={index >= 3 ? "hidden md:block" : ""}>
                <WorkCard work={asWorkCard(work)} index={index} compact />
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock text="平台正在积累首批孵化作品。" compact />
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="正在孵化" eyebrow="In Incubation" action={<CompactAction href="/incubation">查看孵化池</CompactAction>} />
        {incubationWorks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {incubationWorks.slice(0, 3).map((work, index) => (
              <WorkCard key={work.id} work={asWorkCard(work)} index={index + 6} compact />
            ))}
          </div>
        ) : (
          <EmptyBlock text="平台正在筛选首批可进入孵化验证的作品。" compact />
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="预售验证" eyebrow="Presale Validation" action={<CompactAction href="/presale">查看预售</CompactAction>} />
        {activePresaleCampaigns.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {activePresaleCampaigns.map((campaign, index) => {
              const progress = presaleProgress(campaign.currentCount, campaign.targetCount);
              return (
                <Link key={campaign.id} href={`/works/${campaign.workId}`} className="overflow-hidden rounded-[8px] border border-black/8 bg-white transition hover:border-ink/35">
                  <img src={visualFor(index + 8, campaign.work.images[0])} alt={campaign.work.title} className="aspect-[4/3] w-full object-cover" />
                  <span className="block space-y-3 p-4">
                    <span className="block line-clamp-2 text-sm font-semibold text-ink">{campaign.title}</span>
                    <span className="flex items-center justify-between text-xs text-ink/50">
                      <span>{campaign.currentCount} / {campaign.targetCount} 人</span>
                      <span>{campaign.estimatedPrice ?? "价格待定"}</span>
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full bg-paper">
                      <span className="block h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyBlock text="平台正在准备首批预售验证作品。" compact />
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="合作资源" eyebrow="Resources" />
        {hasResources ? (
          <div className="grid gap-4 lg:grid-cols-4">
            {featuredSchools.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">推荐学校</h3>
                  <Link href="/schools" className="text-xs font-semibold text-ink/45">更多</Link>
                </div>
                <div className="space-y-3">
                  {featuredSchools.map((school) => (
                    <Link key={school.id} href={`/schools/${school.slug ?? school.id}`} className="flex gap-3">
                      <img src={schoolCoverUrl(school.coverUrl ?? school.logoUrl)} alt={school.name} className="size-14 rounded-[6px] object-cover" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-ink">{school.name}</span>
                        <span className="mt-1 block text-xs text-ink/45">{school.city ?? "城市待补充"} / {school._count.works} 件作品</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {featuredTeachers.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">推荐老师</h3>
                  <Link href="/teachers" className="text-xs font-semibold text-ink/45">更多</Link>
                </div>
                <div className="space-y-3">
                  {featuredTeachers.map((teacher) => (
                    <Link key={teacher.id} href={`/teachers/${teacher.slug ?? teacher.id}`} className="flex gap-3">
                      <img src={teacherAvatarUrl(teacher.avatarUrl)} alt={teacher.name} className="size-14 rounded-full object-cover" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-ink">{teacher.name}</span>
                        <span className="mt-1 block text-xs text-ink/45">{teacher.school?.name ?? "学校待关联"} / 推荐 {teacher._count.recommendations}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {featuredProviders.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">推荐服务商</h3>
                  <Link href="/providers" className="text-xs font-semibold text-ink/45">更多</Link>
                </div>
                <div className="space-y-3">
                  {featuredProviders.map((provider) => (
                    <Link key={provider.id} href={`/providers/${provider.slug ?? provider.id}`} className="flex gap-3">
                      <img src={providerLogoUrl(provider.logoUrl)} alt={provider.name} className="size-14 rounded-[6px] object-cover" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-ink">{provider.name}</span>
                        <span className="mt-1 block text-xs text-ink/45">{PROVIDER_TYPE_LABELS[provider.type]} / {provider._count.workProposals} 个服务商方案</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {featuredFabrics.length ? (
              <div className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">推荐面料</h3>
                  <Link href="/fabrics" className="text-xs font-semibold text-ink/45">更多</Link>
                </div>
                <div className="space-y-3">
                  {featuredFabrics.map((fabric) => (
                    <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="flex gap-3">
                      <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="size-14 rounded-[6px] object-cover" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-ink">{fabric.name}</span>
                        <span className="mt-1 block text-xs text-ink/45">{fabric.provider?.name ?? "供应商待关联"}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyBlock text="合作资源正在整理中。" compact />
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="成功案例 / 合作项目" eyebrow="Projects" action={<CompactAction href="/projects">查看合作项目</CompactAction>} />
        {hasCasesOrProjects ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[8px] border border-black/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                <h3 className="font-semibold text-ink">精选合作项目</h3>
              </div>
              <div className="space-y-3">
                {featuredProjects.length ? featuredProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.slug ?? project.id}`} className="block rounded-[6px] bg-paper p-3">
                    <span className="line-clamp-1 text-sm font-semibold text-ink">{project.title}</span>
                    <span className="mt-1 block text-xs text-ink/45">{project.work.title} / 意向 {project._count.orders}</span>
                  </Link>
                )) : <p className="text-sm text-ink/52">平台正在积累首批孵化案例。</p>}
              </div>
            </div>

            <div className="rounded-[8px] border border-black/8 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Scissors size={16} />
                <h3 className="font-semibold text-ink">成功案例</h3>
              </div>
              <div className="space-y-3">
                {featuredCases.length ? featuredCases.map((item) => (
                  <Link key={item.id} href={`/cases/${item.slug ?? item.id}`} className="block rounded-[6px] bg-paper p-3">
                    <span className="line-clamp-1 text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-1 block text-xs text-ink/45">{item.provider?.name ?? item.project?.title ?? "合作记录"}</span>
                  </Link>
                )) : <p className="text-sm text-ink/52">平台正在积累首批孵化案例。</p>}
              </div>
            </div>
          </div>
        ) : (
          <EmptyBlock text="平台正在积累首批孵化案例。" />
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="你是谁？从这里开始。" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {roleCards.map((card) => (
            <RoleCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <SectionHeader title="作品孵化路径" eyebrow="Incubation Flow" />
        <div className="flex gap-3 overflow-x-auto pb-2 md:overflow-visible">
          {flowSteps.map((step, index) => (
            <FlowStep key={step.title} step={step} index={index} />
          ))}
        </div>
      </section>

      <footer className="mt-12 border-t border-black/8 pt-6">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink/45">
          {ruleLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
