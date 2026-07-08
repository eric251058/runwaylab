import Link from "next/link";
import { ActionGuide } from "@/components/ActionGuide";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const adminLinks = [
  ["/admin/works", "作品审核"],
  ["/admin/editorial", "运营推荐"],
  ["/admin/incubation", "孵化管理"],
  ["/admin/verifications", "认证审核"],
  ["/admin/projects", "合作项目"],
  ["/admin/project-orders", "项目意向"],
  ["/admin/reviews", "评价管理"],
  ["/admin/cases", "成功案例"],
  ["/admin/providers", "服务商"],
  ["/admin/fabrics", "面料库"],
  ["/admin/presale-campaigns", "预售活动"],
  ["/admin/users", "用户管理"]
];

const operationActions = [
  ["/admin/works", "审核作品", "先让优质作品通过审核，进入公开展示。"],
  ["/admin/editorial", "设置首页精选", "把适合转化的作品放到首页和榜单入口。"],
  ["/admin/recommendations", "添加老师推荐", "为学生作品补充老师背书和推荐理由。"],
  ["/admin/work-fabric-recommendations", "推荐面料", "把面料库资源匹配到合适作品。"],
  ["/admin/provider-proposals", "添加服务商方案", "补充打样、生产、买手反馈等轻量方案。"],
  ["/admin/presale-campaigns", "创建预售活动", "开启不收款的预售意向验证。"],
  ["/admin/projects", "创建合作项目", "把成熟作品推进到合作项目展示。"],
  ["/admin/cases", "创建成功案例", "沉淀已经跑通的孵化案例。"]
];

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  const [counts, latestVerifications, latestProjects, latestProviderApplications, latestPresaleIntents] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.work.count(),
      prisma.school.count(),
      prisma.teacher.count(),
      prisma.provider.count(),
      prisma.fabric.count(),
      prisma.presaleCampaign.count(),
      prisma.presaleCampaignIntent.count(),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.collaborationProject.count()
    ]),
    prisma.verificationRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.collaborationProject.findMany({ include: { work: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.providerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.presaleCampaignIntent.findMany({ include: { campaign: true, work: true }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  const [userCount, workCount, schoolCount, teacherCount, providerCount, fabricCount, campaignCount, presaleIntentCount, pendingVerificationCount, projectCount] = counts;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">后台总控台</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">总览平台用户、作品、学校、服务商、预售、认证和合作项目。V1.0 仍不处理支付、退款、物流或真实订单。</p>
      </header>

      <section className="mb-8">
        <ActionGuide
          eyebrow="Today"
          title="今日运营动作：从作品审核到孵化闭环，一步一步推进。"
          description="这里仅提供快捷入口和运营提醒，不新增交易、订单、支付或复杂权限。"
          actions={[
            { label: "审核作品", href: "/admin/works", primary: true },
            { label: "创建预售活动", href: "/admin/presale-campaigns" },
            { label: "创建合作项目", href: "/admin/projects" }
          ]}
        />
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {operationActions.map(([href, title, description]) => (
          <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
            <span className="block text-base font-semibold text-ink">{title}</span>
            <span className="mt-2 block text-sm leading-6 text-ink/55">{description}</span>
          </Link>
        ))}
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stat("用户数量", userCount)}
        {stat("作品数量", workCount)}
        {stat("学校数量", schoolCount)}
        {stat("老师数量", teacherCount)}
        {stat("服务商数量", providerCount)}
        {stat("面料数量", fabricCount)}
        {stat("预售活动", campaignCount)}
        {stat("预售意向", presaleIntentCount)}
        {stat("认证待审核", pendingVerificationCount)}
        {stat("合作项目", projectCount)}
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {adminLinks.map(([href, title]) => (
          <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-5 text-lg font-semibold text-ink transition hover:border-ink/35">
            {title}
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新认证申请</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestVerifications.length ? latestVerifications.map((item) => <p key={item.id}>{item.user.nickname} / {item.type} / {item.status}</p>) : <p>暂无认证申请</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新合作项目</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestProjects.length ? latestProjects.map((item) => <p key={item.id}>{item.title} / {item.work.title} / {item.status}</p>) : <p>暂无合作项目</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-ink">最新服务商申请</h2>
          <div className="mt-3 space-y-2 text-sm text-ink/58">
            {latestProviderApplications.length ? latestProviderApplications.map((item) => <p key={item.id}>{item.companyName} / {item.providerType} / {item.status}</p>) : <p>暂无服务商申请</p>}
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
