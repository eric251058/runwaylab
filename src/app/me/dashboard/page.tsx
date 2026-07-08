import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ProviderType, UserPersona } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_PERSONA_LABELS } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="rounded-[8px] border border-black/8 bg-white p-5 transition hover:border-ink/35">
      <span className="block text-base font-semibold text-ink">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-ink/55">{description}</span>
    </Link>
  );
}

function EmptyNote({ children }: { children: string }) {
  return <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm leading-6 text-ink/56">{children}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-black/8 bg-white/70 p-5">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function MeDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me/dashboard");
  }

  const currentUser = user;

  if (!currentUser.personaCompleted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-[8px] bg-white p-6 shadow-[0_18px_50px_rgba(16,16,16,0.08)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Persona</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-5xl">先选择你的身份</h1>
          <p className="mt-4 text-sm leading-6 text-ink/58">完成身份选择后，RunwayLab 会展示更适合你的个人工作台。</p>
          <Link href="/me/onboarding" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            去选择身份
          </Link>
        </section>
      </div>
    );
  }

  const [
    works,
    favoriteCount,
    likedCount,
    submittedCampaignIntentCount,
    receivedLegacyPresaleCount,
    receivedCampaignIntentCount,
    receivedFabricRecommendationCount,
    receivedProviderProposalCount,
    providerMatches,
    teacherProfile,
    hotPresaleCampaigns,
    hotWorks
  ] = await Promise.all([
    prisma.work.findMany({
      where: { userId: currentUser.id },
      include: { workIncubation: true },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    prisma.favorite.count({ where: { userId: currentUser.id } }),
    prisma.like.count({ where: { userId: currentUser.id } }),
    prisma.presaleCampaignIntent.count({ where: { userId: currentUser.id } }),
    prisma.presaleIntent.count({ where: { work: { userId: currentUser.id } } }),
    prisma.presaleCampaignIntent.count({ where: { work: { userId: currentUser.id } } }),
    prisma.workFabricRecommendation.count({ where: { work: { userId: currentUser.id } } }),
    prisma.providerWorkProposal.count({ where: { work: { userId: currentUser.id } } }),
    prisma.provider.findMany({
      where: {
        OR: [{ contactEmail: currentUser.email }, { contactName: currentUser.nickname }]
      },
      include: { _count: { select: { fabrics: true, workProposals: true, fabricRecommendations: true } } },
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }]
    }),
    prisma.teacher.findFirst({
      where: { userId: currentUser.id },
      include: {
        school: true,
        _count: {
          select: {
            recommendations: true,
            exhibitions: true,
            challenges: true
          }
        }
      }
    }),
    prisma.presaleCampaign.findMany({
      where: { status: "ACTIVE" },
      include: { work: true },
      orderBy: [{ currentCount: "desc" }, { createdAt: "desc" }],
      take: 4
    }),
    prisma.work.findMany({
      where: { reviewStatus: "APPROVED", contentStatus: "VISIBLE" },
      orderBy: [{ likeCount: "desc" }, { favoriteCount: "desc" }, { createdAt: "desc" }],
      take: 4
    })
  ]);

  const totalLikes = works.reduce((sum, work) => sum + work.likeCount, 0);
  const totalFavorites = works.reduce((sum, work) => sum + work.favoriteCount, 0);
  const incubatingWorkCount = works.filter((work) => work.wantsIncubation || work.incubationStatus || (work.workIncubation && work.workIncubation.status !== "DISPLAYING")).length;
  const providerTypeMap: Partial<Record<UserPersona, ProviderType>> = {
    FABRIC_SUPPLIER: ProviderType.FABRIC_SUPPLIER,
    SAMPLE_STUDIO: ProviderType.SAMPLE_STUDIO,
    FACTORY: ProviderType.FACTORY,
    BUYER: ProviderType.BUYER
  };
  const expectedProviderType = providerTypeMap[currentUser.persona];
  const matchedProviders = expectedProviderType ? providerMatches.filter((provider) => provider.type === expectedProviderType) : providerMatches;

  function renderProviderDashboard(kind: "fabric" | "sample" | "factory") {
    const copy = {
      fabric: {
        title: "面料商工作台",
        providerTitle: "我的服务商身份",
        libraryTitle: "我的面料库",
        planTitle: "被推荐给作品的面料",
        incubationTitle: "可参与孵化作品"
      },
      sample: {
        title: "打样工作室工作台",
        providerTitle: "服务商主页入口",
        libraryTitle: "我提交的打样方案",
        planTitle: "被采纳 / 待审核方案",
        incubationTitle: "可参与打样的作品"
      },
      factory: {
        title: "服装工厂工作台",
        providerTitle: "服务商主页入口",
        libraryTitle: "生产方案",
        planTitle: "MOQ / 周期 / 报价说明",
        incubationTitle: "可生产作品"
      }
    }[kind];

    return (
      <>
        <Section title={copy.title}>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="匹配服务商身份" value={matchedProviders.length} />
            <StatCard label={kind === "fabric" ? "面料数量" : "方案数量"} value={matchedProviders.reduce((sum, provider) => sum + (kind === "fabric" ? provider._count.fabrics : provider._count.workProposals), 0)} />
            <StatCard label="可参与孵化作品" value={hotWorks.length} />
          </div>
        </Section>
        {matchedProviders.length ? (
          <Section title={copy.providerTitle}>
            <div className="grid gap-3 md:grid-cols-2">
              {matchedProviders.map((provider) => (
                <ActionCard key={provider.id} title={provider.name} description={`面料 ${provider._count.fabrics} / 方案 ${provider._count.workProposals}`} href={`/providers/${provider.slug ?? provider.id}`} />
              ))}
            </div>
          </Section>
        ) : (
          <EmptyNote>当前账号还没有绑定服务商资料。你可以先提交服务商入驻申请，后台审核后进入服务商市场。</EmptyNote>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <ActionCard title={copy.libraryTitle} description="查看服务商市场和面料库公开资料。" href={kind === "fabric" ? "/fabrics" : "/providers"} />
          <ActionCard title={copy.planTitle} description="围绕作品提交轻量方案，本批不涉及交易和订单。" href="/incubation" />
          <ActionCard title="服务商入驻入口" description="提交公司、联系方式和服务说明，由平台后续审核。" href="/providers/apply" />
        </div>
      </>
    );
  }

  function renderDashboard() {
    switch (currentUser.persona) {
      case UserPersona.DESIGNER:
        return (
          <>
            <Section title="设计师工作台">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="我的作品数" value={works.length} />
                <StatCard label="收到点赞" value={totalLikes} />
                <StatCard label="收到收藏" value={totalFavorites} />
                <StatCard label="预售意向" value={receivedLegacyPresaleCount + receivedCampaignIntentCount} />
                <StatCard label="孵化作品" value={incubatingWorkCount} />
              </div>
            </Section>
            <div className="grid gap-3 md:grid-cols-4">
              <ActionCard title="发布新作品" description="上传你的设计作品，进入展示、热度和孵化流程。" href="/publish" />
              <ActionCard title="孵化进度" description="查看面料推荐、服务商方案、预售验证和采购意向。" href="/me/incubation" />
              <ActionCard title="预售验证" description="查看正在验证的作品和市场意向。" href="/presale" />
              <ActionCard title="作品库" description="浏览全站作品，观察热度和风格趋势。" href="/works" />
            </div>
          </>
        );
      case UserPersona.FABRIC_SUPPLIER:
        return renderProviderDashboard("fabric");
      case UserPersona.SAMPLE_STUDIO:
        return renderProviderDashboard("sample");
      case UserPersona.FACTORY:
        return renderProviderDashboard("factory");
      case UserPersona.BUYER:
        return (
          <>
            <Section title="买手 / 采购商工作台">
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="热门预售作品" value={hotPresaleCampaigns.length} />
                <StatCard label="关注作品" value={favoriteCount} />
                <StatCard label="已提交预售意向" value={submittedCampaignIntentCount} />
              </div>
            </Section>
            <div className="grid gap-3 md:grid-cols-3">
              <ActionCard title="热门预售作品" description="查看正在收集市场意向的作品。" href="/presale" />
              <ActionCard title="热门榜单" description="按热度、预售和采购信号观察趋势。" href="/rankings" />
              <ActionCard title="采购意向" description="从作品详情提交采购或买手反馈。" href="/works" />
            </div>
          </>
        );
      case UserPersona.CONSUMER:
        return (
          <>
            <Section title="普通用户工作台">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="我点赞的作品" value={likedCount} />
                <StatCard label="我收藏的作品" value={favoriteCount} />
                <StatCard label="预售意向" value={submittedCampaignIntentCount} />
                <StatCard label="推荐作品" value={hotWorks.length} />
              </div>
            </Section>
            <div className="grid gap-3 md:grid-cols-3">
              <ActionCard title="浏览作品" description="发现服装设计学生和新锐设计师作品。" href="/works" />
              <ActionCard title="查看排行榜" description="查看热度、预售、采购和新锐榜单。" href="/rankings" />
              <ActionCard title="查看预售" description="提交预售意向，不涉及支付和订单。" href="/presale" />
            </div>
          </>
        );
      case UserPersona.TEACHER:
        return (
          <>
            <Section title="老师工作台">
              {teacherProfile ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <StatCard label="推荐作品" value={teacherProfile._count.recommendations} />
                  <StatCard label="课程作品展" value={teacherProfile._count.exhibitions} />
                  <StatCard label="挑战赛" value={teacherProfile._count.challenges} />
                  <StatCard label="所属学校" value={teacherProfile.school?.name ?? "待关联"} />
                </div>
              ) : (
                <EmptyNote>老师身份待平台关联。后台在老师管理中绑定当前用户后，这里会展示老师主页、推荐作品和课程活动。</EmptyNote>
              )}
            </Section>
            <div className="grid gap-3 md:grid-cols-3">
              <ActionCard title="老师主页" description="查看老师列表和老师主页。" href="/teachers" />
              <ActionCard title="课程作品展" description="查看学校和老师关联的作品展。" href="/exhibitions" />
              <ActionCard title="设计挑战赛" description="查看正在进行或已发布的挑战赛。" href="/challenges" />
            </div>
          </>
        );
      case UserPersona.SCHOOL:
        return (
          <>
            <Section title="学校工作台">
              <EmptyNote>学校身份待平台关联。本批不新增复杂学校账号权限，学校主页、老师、作品展和挑战赛仍由后台维护。</EmptyNote>
            </Section>
            <div className="grid gap-3 md:grid-cols-4">
              <ActionCard title="学校主页" description="查看学校列表和学校作品。" href="/schools" />
              <ActionCard title="老师列表" description="查看老师与推荐作品。" href="/teachers" />
              <ActionCard title="课程作品展" description="查看课程、毕业设计和专题展。" href="/exhibitions" />
              <ActionCard title="设计挑战赛" description="查看学校或平台挑战赛。" href="/challenges" />
            </div>
          </>
        );
      default:
        return (
          <>
            <Section title="通用工作台">
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="收藏作品" value={favoriteCount} />
                <StatCard label="点赞作品" value={likedCount} />
                <StatCard label="预售意向" value={submittedCampaignIntentCount} />
              </div>
            </Section>
            <div className="grid gap-3 md:grid-cols-5">
              <ActionCard title="浏览作品" description="查看作品库。" href="/works" />
              <ActionCard title="查看排行榜" description="查看运营榜单。" href="/rankings" />
              <ActionCard title="查看预售" description="浏览预售验证活动。" href="/presale" />
              <ActionCard title="申请服务商" description="提交服务商入驻申请。" href="/providers/apply" />
              <ActionCard title="完善资料" description="编辑个人资料。" href="/me/profile" />
            </div>
          </>
        );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">我的工作台</h1>
          <p className="mt-4 text-sm leading-6 text-ink/58">当前身份：{USER_PERSONA_LABELS[currentUser.persona]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/me/onboarding" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
            切换身份
          </Link>
          <Link href="/me" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            返回我的页面
          </Link>
        </div>
      </header>

      <div className="space-y-5">{renderDashboard()}</div>
    </div>
  );
}
