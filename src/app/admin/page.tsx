import Link from "next/link";
import {
  CollaborationProjectStatus,
  ContributionStatus,
  OpportunityStage,
  ProviderApplicationStatus,
  ProviderWorkProposalStatus,
  PresaleCampaignIntentStatus,
  ReviewStatus,
  WorkVoteStatus,
  WorkVoteType
} from "@prisma/client";
import { ActionGuide } from "@/components/ActionGuide";
import { PROJECT_STATUS_LABELS, VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { getHeatScore } from "@/lib/operation-growth";
import { PRESALE_INTENT_STATUS_LABELS } from "@/lib/presale-campaign";
import { PROVIDER_PROPOSAL_STATUS_LABELS, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const adminLinks = [
  ["/admin/works", "作品管理", "审核、下架、精选和孵化候选"],
  ["/admin/editorial", "编辑推荐", "首页精选、榜单和运营推荐"],
  ["/admin/incubation", "孵化管理", "查看孵化状态和产业信号"],
  ["/admin/opportunities", "机会管理", "审核订单成熟度和服务商机会池"],
  ["/admin/recommendations", "老师推荐", "维护老师推荐作品"],
  ["/admin/work-fabric-recommendations", "面料推荐", "为作品匹配面料资源"],
  ["/admin/provider-applications", "服务商申请", "处理入驻申请"],
  ["/admin/provider-proposals", "服务商方案", "跟进打样、生产和买手方案"],
  ["/admin/contributions", "用户贡献", "查看投票和孵化建议"],
  ["/admin/presale-campaigns", "预售活动", "创建和维护预售验证"],
  ["/admin/presale-intents", "预售意向", "跟进用户和买手兴趣"],
  ["/admin/projects", "合作项目", "推进商业合作项目"],
  ["/admin/cases", "成功案例", "沉淀平台案例"],
  ["/admin/users", "用户管理", "查看用户与身份选择"]
] as const;

const operationActions = [
  ["/admin/works", "审核作品", "先让优质作品通过审核，进入公开展示。"],
  ["/admin/editorial", "设置首页精选", "把适合转化的作品放到首页和榜单入口。"],
  ["/admin/presale-campaigns", "创建预售活动", "开启不收款的预售意向验证。"],
  ["/admin/opportunities", "管理合格机会", "审核可打样、小单和规模生产项目。"],
  ["/admin/projects", "创建合作项目", "把成熟作品推进到合作项目展示。"]
] as const;

const providerApplicationStatusLabels: Record<string, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

function stat(label: string, value: number, description: string) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/45">{description}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function operationSuggestion(work: {
  description: string;
  images: unknown[];
  teacherRecommendations: unknown[];
  fabricRecommendations: unknown[];
  fabricProposals: unknown[];
  providerWorkProposals: unknown[];
  sampleProposals: unknown[];
  factoryProposals: unknown[];
  buyerIntents: unknown[];
  presaleCampaigns: unknown[];
  presaleCampaignIntents: unknown[];
}) {
  const fabricCount = work.fabricRecommendations.length + work.fabricProposals.length;
  const serviceCount = work.providerWorkProposals.length + work.sampleProposals.length + work.factoryProposals.length + work.buyerIntents.length;

  if (!work.images.length || !work.description.trim()) return "建议补充作品内容";
  if (work.teacherRecommendations.length && fabricCount === 0) return "建议匹配面料";
  if (fabricCount > 0 && serviceCount === 0) return "建议邀请打样 / 工厂方案";
  if (serviceCount > 0 && work.presaleCampaigns.length === 0) return "建议开启预售验证";
  if (work.presaleCampaignIntents.length) return "建议跟进意向用户";
  return "值得持续观察";
}

export default async function AdminPage() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    todayCounts,
    pendingCounts,
    contributionCounts,
    contentCounts,
    potentialWorks,
    latestVerifications,
    latestProjects,
    latestProviderApplications,
    latestProviderProposals,
    latestPresaleIntents
  ] = await Promise.all([
    Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.work.count({ where: { createdAt: { gte: since } } }),
      prisma.presaleCampaignIntent.count({ where: { createdAt: { gte: since } } }),
      prisma.providerApplication.count({ where: { createdAt: { gte: since } } }),
      prisma.providerWorkProposal.count({ where: { createdAt: { gte: since } } }),
      prisma.collaborationProject.count({ where: { createdAt: { gte: since } } })
    ]),
    Promise.all([
      prisma.work.count({ where: { reviewStatus: ReviewStatus.PENDING } }),
      prisma.providerApplication.count({ where: { status: ProviderApplicationStatus.PENDING } }),
      prisma.providerWorkProposal.count({ where: { status: ProviderWorkProposalStatus.PENDING } }),
      prisma.presaleCampaignIntent.count({ where: { status: PresaleCampaignIntentStatus.SUBMITTED } }),
      prisma.work.count({ where: { OR: [{ images: { none: {} } }, { description: "" }] } }),
      prisma.collaborationProject.count({ where: { status: { notIn: [CollaborationProjectStatus.DRAFT, CollaborationProjectStatus.CANCELLED] }, caseStudies: { none: {} } } })
    ]),
    Promise.all([
      prisma.workContribution.count({ where: { status: ContributionStatus.NEW } }),
      prisma.workContribution.count({ where: { createdAt: { gte: since } } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE, createdAt: { gte: since } } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.HIDDEN } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE, type: WorkVoteType.WANT_BUY } }),
      prisma.workVote.count({ where: { status: WorkVoteStatus.ACTIVE, type: WorkVoteType.CONFUSING } })
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
    prisma.work.findMany({
      where: {
        reviewStatus: ReviewStatus.APPROVED
      },
      include: {
        user: true,
        images: true,
        teacherRecommendations: true,
        fabricRecommendations: true,
        fabricProposals: true,
        providerWorkProposals: true,
        sampleProposals: true,
        factoryProposals: true,
        buyerIntents: true,
        presaleCampaigns: true,
        presaleCampaignIntents: true
      },
      orderBy: [{ isEditorPick: "desc" }, { isFeatured: "desc" }, { likeCount: "desc" }, { favoriteCount: "desc" }],
      take: 18
    }),
    prisma.verificationRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.collaborationProject.findMany({ include: { work: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.providerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.providerWorkProposal.findMany({ include: { work: true, provider: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.presaleCampaignIntent.findMany({ include: { campaign: true, work: true }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  const [todayUsers, todayWorks, todayPresaleIntents, todayProviderApplications, todayProviderProposals, todayProjects] = todayCounts;
  const [pendingWorks, pendingProviderApplications, pendingProviderProposals, pendingPresaleIntents, incompleteWorks, projectsWithoutCases] = pendingCounts;
  const [pendingContributions, todayNewContributions, todayContributionVotes, hiddenVotes, wantBuyVotes, confusingVotes] = contributionCounts;
  const opportunityFunnel = await Promise.all([
    prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.DISPLAY_ONLY } }),
    prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SAMPLE_READY } }),
    prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SMALL_BATCH_READY } }),
    prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SCALE_READY } }),
    prisma.workOpportunityProfile.count({ where: { adminApproved: true } }),
    prisma.workOpportunityProfile.count({ where: { work: { providerOpportunityInterests: { some: {} } } } }),
    prisma.workOpportunityProfile.count({ where: { OR: [{ buyerInterestCount: { gt: 0 } }, { confirmedBuyerQuantity: { gt: 0 } }] } })
  ]);

  const highPotentialWorks = potentialWorks
    .map((work) => {
      const heatScore = getHeatScore({
        likeCount: work.likeCount,
        favoriteCount: work.favoriteCount,
        commentCount: work.commentCount,
        presaleIntentCount: work.presaleCampaignIntents.length,
        fabricProposalCount: work.fabricRecommendations.length + work.fabricProposals.length,
        sampleProposalCount: work.providerWorkProposals.length + work.sampleProposals.length,
        factoryProposalCount: work.factoryProposals.length,
        buyerIntentCount: work.buyerIntents.length
      });

      return {
        ...work,
        heatScore,
        suggestion: operationSuggestion(work)
      };
    })
    .sort((left, right) => right.heatScore - left.heatScore)
    .slice(0, 6);

  const pendingItems = [
    ["待审核作品", pendingWorks, "/admin/works", "去作品管理"],
    ["待处理服务商申请", pendingProviderApplications, "/admin/provider-applications", "去服务商申请"],
    ["待处理服务商方案", pendingProviderProposals, "/admin/provider-proposals", "去服务商方案"],
    ["待跟进预售意向", pendingPresaleIntents, "/admin/presale-intents", "去预售意向"],
    ["待处理用户建议", pendingContributions, "/admin/contributions", "去用户贡献"],
    ["待完善内容作品", incompleteWorks, "/admin/works", "去作品管理"],
    ["待生成案例项目", projectsWithoutCases, "/admin/cases", "去案例管理"]
  ] as const;

  const completenessItems = [
    ["缺少真实图片", contentCounts[0], "图片不足会降低作品可信度", "/admin/works"],
    ["缺少作品说明", contentCounts[1], "说明不足会影响老师和服务商判断", "/admin/works"],
    ["缺少老师推荐", contentCounts[2], "老师推荐能帮助作品建立专业背书", "/admin/recommendations"],
    ["缺少面料推荐", contentCounts[3], "面料线索会让作品更容易进入打样", "/admin/work-fabric-recommendations"],
    ["缺少服务商方案", contentCounts[4], "方案不足会影响后续报价和生产判断", "/admin/provider-proposals"],
    ["缺少预售验证", contentCounts[5], "预售意向能判断市场需求", "/admin/presale-campaigns"],
    ["缺少合作项目", contentCounts[6], "成熟作品需要沉淀成可展示项目", "/admin/projects"],
    ["缺少成功案例", contentCounts[7], "案例是平台可信度的重要资产", "/admin/cases"]
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">运营控制台</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4">快速判断值得推荐、需要补齐、适合孵化和需要跟进的作品与合作资源。</p>
      </header>

      <section className="mb-8">
        <ActionGuide
          eyebrow="Today"
          title="今日运营动作"
          description="先处理待审核和待跟进，再把高潜力作品推进到面料、打样、预售和合作项目。"
          actions={[
            { label: "审核作品", href: "/admin/works", primary: true },
            { label: "跟进预售意向", href: "/admin/presale-intents" },
            { label: "处理服务商方案", href: "/admin/provider-proposals" }
          ]}
        />
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-3 xl:grid-cols-6">
        {stat("今日新增用户", todayUsers, "过去 24 小时注册用户")}
        {stat("今日新增作品", todayWorks, "过去 24 小时新发布作品")}
        {stat("今日新增预售意向", todayPresaleIntents, "过去 24 小时提交意向")}
        {stat("今日新增服务商申请", todayProviderApplications, "过去 24 小时入驻申请")}
        {stat("今日新增服务商方案", todayProviderProposals, "过去 24 小时提交方案")}
        {stat("今日新增合作项目", todayProjects, "过去 24 小时新增项目")}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Pending</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">待处理事项</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink/55">把需要人工判断的事项集中在这里，减少运营人员来回查找。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pendingItems.map(([title, value, href, action]) => (
            <div key={title} className="rounded-[8px] bg-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
                </div>
                <Link href={href} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white">
                  {action}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">User Signals</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">用户贡献</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">把用户、老师、服务商和买手的判断集中起来，辅助运营筛选值得孵化、预售和合作推进的作品。</p>
          </div>
          <Link href="/admin/contributions" className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            查看用户贡献
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {stat("待处理建议", pendingContributions, "需要运营筛选的孵化建议")}
          {stat("今日新增建议", todayNewContributions, "过去 24 小时提交建议")}
          {stat("今日有效投票", todayContributionVotes, "过去 24 小时有效判断")}
          {stat("隐藏投票", hiddenVotes, "不参与统计的投票")}
          {stat("想买判断", wantBuyVotes, "累计有效购买兴趣")}
          {stat("看不懂判断", confusingVotes, "需要优化表达的信号")}
        </div>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Order Funnel</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">订单机会漏斗</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">区分仅展示、可打样、可小单和可规模生产，避免把早期作品直接推给不匹配的服务商。</p>
          </div>
          <Link href="/admin/opportunities" className="inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-fit">
            查看机会管理
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {stat("仅展示", opportunityFunnel[0], "尚未进入机会池")}
          {stat("可打样", opportunityFunnel[1], "适合打样工作室")}
          {stat("可小单", opportunityFunnel[2], "适合小单快反")}
          {stat("可规模生产", opportunityFunnel[3], "适合更成熟工厂")}
          {stat("已审核机会", opportunityFunnel[4], "管理员放入机会池")}
          {stat("有服务商意向", opportunityFunnel[5], "服务商已提交兴趣")}
          {stat("有买手兴趣", opportunityFunnel[6], "存在采购侧信号")}
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-4">
        {operationActions.map(([href, title, description]) => (
          <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
            <span className="block text-base font-semibold text-ink">{title}</span>
            <span className="mt-2 block text-sm leading-6 text-ink/55">{description}</span>
          </Link>
        ))}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Potential</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">高潜力作品</h2>
          </div>
          <Link href="/admin/works" className="text-sm font-semibold text-ink/60 hover:text-ink">去作品管理</Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {highPotentialWorks.length ? highPotentialWorks.map((work) => (
            <article key={work.id} className="rounded-[8px] bg-paper p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-ink">{work.title}</h3>
                  <p className="mt-1 truncate text-sm text-ink/50">{work.user.nickname}</p>
                  <p className="mt-3 text-xs leading-5 text-ink/50">
                    热度 {work.heatScore} / 点赞 {work.likeCount} / 收藏 {work.favoriteCount} / 评论 {work.commentCount}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/65">{work.suggestion}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/works/${work.id}`} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink">查看作品</Link>
                  <Link href="/admin/works" className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">去管理</Link>
                </div>
              </div>
            </article>
          )) : <div className="rounded-[8px] bg-paper p-5 text-sm text-ink/55 lg:col-span-2">暂无高潜力作品，先从作品审核和内容补充开始。</div>}
        </div>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Content Quality</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">内容完整度提醒</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">这些项目会影响平台真实感，建议优先补齐图片、推荐、服务商方案和案例。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {completenessItems.map(([label, value, reason, href]) => (
            <Link key={label} href={href} className="flex min-h-[84px] items-start justify-between gap-3 rounded-[6px] bg-paper px-4 py-3 text-sm">
              <span>
                <span className="block font-semibold text-ink">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-ink/45">{reason}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55">{value}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5 lg:mb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Shortcuts</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">快捷运营入口</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {adminLinks.map(([href, title, description]) => (
            <Link key={href} href={href} className="rounded-[8px] border border-black/8 bg-white p-4 transition hover:border-ink/35">
              <span className="block text-sm font-semibold text-ink">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-ink/45">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-2">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">预售意向跟进</h2>
            <Link href="/admin/presale-intents" className="text-xs font-semibold text-ink/50 hover:text-ink">查看全部</Link>
          </div>
          <div className="space-y-2 text-sm text-ink/58">
            {latestPresaleIntents.length ? latestPresaleIntents.map((item) => (
              <p key={item.id} className="rounded-[6px] bg-paper px-3 py-2">
                {item.work.title} / {item.quantity} 件 / {PRESALE_INTENT_STATUS_LABELS[item.status]} / {formatDate(item.createdAt)}
              </p>
            )) : <p>暂无预售意向</p>}
          </div>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">服务商协作跟进</h2>
            <Link href="/admin/provider-proposals" className="text-xs font-semibold text-ink/50 hover:text-ink">查看方案</Link>
          </div>
          <div className="space-y-2 text-sm text-ink/58">
            {latestProviderProposals.length ? latestProviderProposals.map((item) => (
              <p key={item.id} className="rounded-[6px] bg-paper px-3 py-2">
                {item.provider.name} / {item.work.title} / {PROVIDER_PROPOSAL_STATUS_LABELS[item.status]} / {formatDate(item.createdAt)}
              </p>
            )) : <p>暂无服务商方案</p>}
          </div>
        </div>
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
