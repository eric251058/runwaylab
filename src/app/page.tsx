import Link from "next/link";
import { ArrowRight, Factory, Scissors, SwatchBook } from "lucide-react";
import { CaseStudyStatus } from "@prisma/client";
import { WorkCard } from "@/components/works/WorkCard";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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

const flowSteps = [
  { title: "发布作品", description: "建立清晰的作品页，让作品被看见。" },
  { title: "AI 与专业诊断", description: "整理亮点、风险和下一步需要补充的信息。" },
  { title: "匹配供应链", description: "寻找面料、打样工作室和生产资源。" },
  { title: "进入打样与孵化", description: "围绕真实反馈推进样衣和合作验证。" }
];

const supplyEntries = [
  {
    title: "找面料",
    description: "查看可用于作品孵化的材料与供应商。",
    href: "/providers?type=FABRIC_SUPPLIER",
    icon: SwatchBook
  },
  {
    title: "找打样工作室",
    description: "为毕业设计、系列作品或小批量开发寻找打样支持。",
    href: "/providers?type=SAMPLE_STUDIO",
    icon: Scissors
  },
  {
    title: "找服装工厂",
    description: "查看能承接小单或生产落地的工厂资源。",
    href: "/providers?type=FACTORY",
    icon: Factory
  }
];

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

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const [works, featuredCase] = await Promise.all([
    getHomeWorks(),
    prisma.caseStudy.findFirst({
      where: { status: CaseStudyStatus.PUBLISHED },
      include: { work: true, provider: true, project: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    })
  ]);
  const worksWithInteractions = await attachWorkCardInteractionState(works, currentUser?.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <section className="rounded-[8px] bg-ink px-5 py-9 text-white md:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">RunwayLab</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">让设计作品从创意走向产业。</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 md:text-base md:leading-7">
          展示作品、获得专业反馈、连接面料、打样与生产资源。
        </p>
        <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
          <Link href="/works" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-ink">
            浏览优秀作品
          </Link>
          <Link href="/publish" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white">
            发布我的作品
          </Link>
        </div>
        <Link href="/providers/apply" className="mt-5 inline-flex text-sm font-semibold text-white/65 hover:text-white">
          服务商入驻 <ArrowRight className="ml-1" size={15} />
        </Link>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Featured Works</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">精选作品</h2>
          </div>
          <Link href="/works" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
            浏览作品库 <ArrowRight size={15} />
          </Link>
        </div>
        {worksWithInteractions.length ? (
          <div className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {worksWithInteractions.map((work, index) => (
              <WorkCard key={work.id} work={asWorkCard(work)} index={index} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在筛选首批高质量作品。</div>
        )}
      </section>

      <section className="mt-10 md:mt-12">
        <h2 className="text-2xl font-semibold text-ink md:text-3xl">作品如何推进</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {flowSteps.map((step, index) => (
            <div key={step.title} className="rounded-[8px] border border-black/8 bg-white p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{index + 1}</span>
              <h3 className="mt-4 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-ink/55">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 md:mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Supply Network</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">找到下一步资源</h2>
          </div>
          <Link href="/providers" className="hidden items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink sm:inline-flex">
            浏览供应链 <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {supplyEntries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link key={entry.href} href={entry.href} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
                <Icon size={22} />
                <h3 className="mt-4 text-lg font-semibold text-ink">{entry.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/55">{entry.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-[8px] border border-black/8 bg-white p-5 md:mt-12 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Why RunwayLab</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">把作品推进到可判断的下一步</h2>
        {featuredCase ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/58">
            当前案例：{featuredCase.title}。RunwayLab 会把作品、专业反馈、供应链资源和合作记录放在同一条路径里，帮助设计师和产业方更快判断是否继续推进。
          </p>
        ) : (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/58">
            平台正在积累首批真实孵化案例。现在你可以先发布作品、完善资料，并用供应链目录寻找面料、打样和生产资源。
          </p>
        )}
        <div className="mt-6 grid gap-3 sm:flex">
          <Link href="/publish" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white">发布作品</Link>
          <Link href="/providers" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">浏览供应链</Link>
        </div>
      </section>
    </main>
  );
}
