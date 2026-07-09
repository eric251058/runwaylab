import Link from "next/link";
import { ActionGuide } from "@/components/ActionGuide";
import { PROJECT_STATUS_LABELS, VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const adminLinks = [
  ["/admin/works", "作品审核"],
  ["/admin/editorial", "运营推荐"],
  ["/admin/incubation", "孵化管理"],
  ["/admin/providers", "服务商"],
  ["/admin/presale-campaigns", "预售活动"],
  ["/admin/projects", "合作项目"]
];

const operationActions = [
  ["/admin/works", "审核作品", "先让优质作品通过审核，进入公开展示。"],
  ["/admin/editorial", "设置首页精选", "把适合转化的作品放到首页和榜单入口。"],
  ["/admin/presale-campaigns", "创建预售活动", "开启不收款的预售意向验证。"],
  ["/admin/projects", "创建合作项目", "把成熟作品推进到合作项目展示。"]
];

const providerApplicationStatusLabels: Record<string, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const [counts, contentCounts, latestVerifications, latestProjects, latestProviderApplications, latestPresaleIntents] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.work.count(),
      prisma.provider.count(),
      prisma.presaleCampaignIntent.count(),
      prisma.collaborationProject.count()
    ]),
    Promise.all([
      prisma.work.count({ where: { images: { none: {} } } }),
      prisma.work.count({ where: { description: "" } }),
      prisma.work.count({ where: { teacherRecommendations: { none: {} } } }),
      prisma.work.count({ where: { fabricRecommendations: { none: {} }, fabricProposals: { none: {} } } }),
      prisma.work.count({ where: { providerWorkProposals: { none: {} }, sampleProposals: { none: {} }, factoryProposals: { none: {} }, buyerIntents: { none: {} } } }),
      prisma.work.count({ where: { presaleCampaigns: { none: {} } } }),
      prisma.work.count({ where: { collaborationProjects: { none: {} } } }),
      prisma.collaborationProject.count({ where: { ...publicProjectWhere(), caseStudies: { none: {} } } })
    ]),
    prisma.verificationRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.collaborationProject.findMany({ include: { work: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.providerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.presaleCampaignIntent.findMany({ include: { campaign: true, work: true }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  const [userCount, workCount, providerCount, presaleIntentCount, projectCount] = counts;
  const completenessItems = [
    ["缺少真实图片的作品", contentCounts[0], "/admin/works"],
    ["缺少作品说明的作品", contentCounts[1], "/admin/works"],
    ["缺少老师推荐的作品", contentCounts[2], "/admin/recommendations"],
    ["缺少面料推荐的作品", contentCounts[3], "/admin/work-fabric-recommendations"],
    ["缺少服务商方案的作品", contentCounts[4], "/admin/provider-proposals"],
    ["缺少预售活动的作品", contentCounts[5], "/admin/presale-campaigns"],
    ["缺少合作项目的作品", contentCounts[6], "/admin/projects"],
    ["缺少成功案例的项目", contentCounts[7], "/admin/cases"]
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">后台总控台</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4">先处理作品，再推进预售、服务商和合作项目。</p>
      </header>

      <section className="mb-8">
        <ActionGuide
          eyebrow="Today"
          title="今日运营动作"
          description="从作品审核开始，推进预售验证和合作项目。"
          actions={[
            { label: "审核作品", href: "/admin/works", primary: true },
            { label: "创建预售活动", href: "/admin/presale-campaigns" },
            { label: "创建合作项目", href: "/admin/projects" }
          ]}
        />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-4">
        {operationActions.map(([href, title, description]) => (
          <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
            <span className="block text-base font-semibold text-ink">{title}</span>
            <span className="mt-2 block text-sm leading-6 text-ink/55">{description}</span>
          </Link>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-5">
        {stat("用户数量", userCount)}
        {stat("作品数量", workCount)}
        {stat("服务商数量", providerCount)}
        {stat("预售意向", presaleIntentCount)}
        {stat("合作项目", projectCount)}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Content Quality</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">内容完整度提醒</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">这些项目会影响平台真实感，建议优先补齐图片、推荐、服务商方案和案例。</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {completenessItems.map(([label, value, href]) => (
            <Link key={label} href={href} className="flex items-center justify-between gap-3 rounded-[6px] bg-paper px-4 py-3 text-sm">
              <span className="font-semibold text-ink">{label}</span>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{value}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-3">
        {adminLinks.map(([href, title]) => (
          <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 text-base font-semibold text-ink transition hover:border-ink/35 md:p-5 md:text-lg">
            {title}
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新认证申请</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestVerifications.length ? latestVerifications.map((item) => <p key={item.id}>{item.user.nickname} / {VERIFICATION_TYPE_LABELS[item.type]} / {VERIFICATION_STATUS_LABELS[item.status]}</p>) : <p>暂无认证申请</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新合作项目</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestProjects.length ? latestProjects.map((item) => <p key={item.id}>{item.title} / {item.work.title} / {PROJECT_STATUS_LABELS[item.status]}</p>) : <p>暂无合作项目</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新服务商申请</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestProviderApplications.length ? latestProviderApplications.map((item) => <p key={item.id}>{item.companyName} / {PROVIDER_TYPE_LABELS[item.providerType]} / {providerApplicationStatusLabels[item.status] ?? item.status}</p>) : <p>暂无服务商申请</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新预售意向</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestPresaleIntents.length ? latestPresaleIntents.map((item) => <p key={item.id}>{item.campaign.title} / {item.work.title} / {item.quantity}</p>) : <p>暂无预售意向</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
