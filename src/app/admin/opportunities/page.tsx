import Link from "next/link";
import { FabricStatus, OpportunityStage, SampleStatus } from "@prisma/client";
import {
  calculateOrderMaturity,
  OPPORTUNITY_FABRIC_STATUS_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  SAMPLE_STATUS_LABELS
} from "@/lib/order-maturity";
import { saveAdminOpportunityProfile } from "@/lib/order-maturity-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminOpportunitiesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function decimalText(value?: { toString(): string } | null) {
  return value ? value.toString() : "";
}

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function AdminOpportunitiesPage({ searchParams }: AdminOpportunitiesPageProps) {
  const params = await searchParams;
  const stage = firstValue(params?.stage);
  const approved = firstValue(params?.approved);
  const where = {
    ...(stage && Object.values(OpportunityStage).includes(stage as OpportunityStage) ? { stage: stage as OpportunityStage } : {}),
    ...(approved === "true" ? { adminApproved: true } : approved === "false" ? { adminApproved: false } : {})
  };
  const [profiles, funnel] = await Promise.all([
    prisma.workOpportunityProfile.findMany({
      where,
      include: {
        work: {
          include: {
            images: true,
            teacherRecommendations: true,
            fabricRecommendations: true,
            providerWorkProposals: true,
            presaleCampaignIntents: true,
            buyerIntents: true,
            votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
            providerOpportunityInterests: true
          }
        }
      },
      orderBy: [{ adminApproved: "asc" }, { updatedAt: "desc" }]
    }),
    Promise.all([
      prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.DISPLAY_ONLY } }),
      prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SAMPLE_READY } }),
      prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SMALL_BATCH_READY } }),
      prisma.workOpportunityProfile.count({ where: { stage: OpportunityStage.SCALE_READY } }),
      prisma.workOpportunityProfile.count({ where: { adminApproved: true } }),
      prisma.workOpportunityProfile.count({ where: { work: { providerOpportunityInterests: { some: {} } } } }),
      prisma.workOpportunityProfile.count({ where: { OR: [{ buyerInterestCount: { gt: 0 } }, { confirmedBuyerQuantity: { gt: 0 } }] } })
    ])
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">机会管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">审核作品是否进入服务商机会池，人工调整最终阶段，并维护目标数量、样衣、面料和采购确认信息。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {stat("仅展示", funnel[0])}
        {stat("可打样", funnel[1])}
        {stat("可小单", funnel[2])}
        {stat("可规模生产", funnel[3])}
        {stat("已审核机会", funnel[4])}
        {stat("有服务商意向", funnel[5])}
        {stat("有买手兴趣", funnel[6])}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">新增或更新机会资料</h2>
        <form action={saveAdminOpportunityProfile} className="mt-4 grid gap-3 md:grid-cols-4">
          <input name="workId" required placeholder="作品 ID" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
          <select name="stage" defaultValue={OpportunityStage.DISPLAY_ONLY} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(OpportunityStage).map((value) => <option key={value} value={value}>{OPPORTUNITY_STAGE_LABELS[value]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input name="adminApproved" type="checkbox" />进入机会池</label>
          <input name="targetQuantity" placeholder="目标数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetUnitCost" placeholder="目标成本" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetRetailPrice" placeholder="目标零售价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="sampleBudget" placeholder="打样预算" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <select name="sampleStatus" defaultValue={SampleStatus.NOT_STARTED} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(SampleStatus).map((value) => <option key={value} value={value}>{SAMPLE_STATUS_LABELS[value]}</option>)}
          </select>
          <select name="fabricStatus" defaultValue={FabricStatus.UNKNOWN} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {[FabricStatus.UNKNOWN, FabricStatus.RECOMMENDED, FabricStatus.SELECTED, FabricStatus.CONFIRMED].map((value) => <option key={value} value={value}>{OPPORTUNITY_FABRIC_STATUS_LABELS[value]}</option>)}
          </select>
          <input name="targetLaunchDate" type="date" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetDeliveryDate" type="date" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="expectedFabricMeters" placeholder="预计用料米数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="buyerInterestCount" placeholder="买手兴趣数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="confirmedBuyerQuantity" placeholder="确认采购数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input name="expectedReorder" type="checkbox" />预计可补单</label>
          <textarea name="adminNote" placeholder="后台备注" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-4" />
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white md:col-span-4">保存机会资料</button>
        </form>
      </section>

      <form className="mb-4 flex flex-wrap gap-2 rounded-[8px] border border-black/8 bg-white p-4">
        <select name="stage" defaultValue={stage ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部阶段</option>
          {Object.values(OpportunityStage).map((value) => <option key={value} value={value}>{OPPORTUNITY_STAGE_LABELS[value]}</option>)}
        </select>
        <select name="approved" defaultValue={approved ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部审核状态</option>
          <option value="true">已进入机会池</option>
          <option value="false">未进入机会池</option>
        </select>
        <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">筛选</button>
      </form>

      <section className="space-y-4">
        {profiles.length ? profiles.map((profile) => {
          const maturity = calculateOrderMaturity({
            description: profile.work.description,
            imageCount: profile.work.images.length,
            isEditorPick: profile.work.isEditorPick,
            teacherRecommendationCount: profile.work.teacherRecommendations.length,
            fabricRecommendationCount: profile.work.fabricRecommendations.length,
            providerProposalCount: profile.work.providerWorkProposals.length,
            presaleIntentCount: profile.work.presaleCampaignIntents.length,
            buyerInterestCount: profile.work.buyerIntents.length,
            wantBuyVoteCount: profile.work.votes.length,
            favoriteCount: profile.work.favoriteCount,
            commentCount: profile.work.commentCount,
            profile
          });
          return (
            <article key={profile.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{OPPORTUNITY_STAGE_LABELS[profile.stage]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">推荐：{OPPORTUNITY_STAGE_LABELS[maturity.recommendedStage]}</span>
                    {profile.adminApproved ? <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-800">已进入机会池</span> : <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">待审核</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-ink">{profile.work.title}</h2>
                  <p className="mt-2 text-sm text-ink/52">专业 {maturity.professionalScore} / 生产 {maturity.productionScore} / 市场 {maturity.marketScore} / 服务商意向 {profile.work.providerOpportunityInterests.length}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/45">缺失资料：{maturity.missingItems.join("、") || "资料较完整"}</p>
                </div>
                <Link href={`/works/${profile.workId}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">查看作品</Link>
              </div>
              <form action={saveAdminOpportunityProfile} className="mt-4 grid gap-2 rounded-[8px] bg-paper p-3 md:grid-cols-4">
                <input type="hidden" name="workId" value={profile.workId} />
                <select name="stage" defaultValue={profile.stage} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                  {Object.values(OpportunityStage).map((value) => <option key={value} value={value}>{OPPORTUNITY_STAGE_LABELS[value]}</option>)}
                </select>
                <select name="sampleStatus" defaultValue={profile.sampleStatus} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                  {Object.values(SampleStatus).map((value) => <option key={value} value={value}>{SAMPLE_STATUS_LABELS[value]}</option>)}
                </select>
                <select name="fabricStatus" defaultValue={profile.fabricStatus} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                  {[FabricStatus.UNKNOWN, FabricStatus.RECOMMENDED, FabricStatus.SELECTED, FabricStatus.CONFIRMED].map((value) => <option key={value} value={value}>{OPPORTUNITY_FABRIC_STATUS_LABELS[value]}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm"><input name="adminApproved" type="checkbox" defaultChecked={profile.adminApproved} />进入机会池</label>
                <input name="targetQuantity" defaultValue={profile.targetQuantity ?? ""} placeholder="目标数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="targetUnitCost" defaultValue={decimalText(profile.targetUnitCost)} placeholder="目标成本" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="targetRetailPrice" defaultValue={decimalText(profile.targetRetailPrice)} placeholder="目标零售价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="sampleBudget" defaultValue={decimalText(profile.sampleBudget)} placeholder="打样预算" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="targetLaunchDate" defaultValue={dateInput(profile.targetLaunchDate)} type="date" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="targetDeliveryDate" defaultValue={dateInput(profile.targetDeliveryDate)} type="date" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="confirmedBuyerQuantity" defaultValue={profile.confirmedBuyerQuantity} placeholder="确认采购数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input name="expectedReorder" type="checkbox" defaultChecked={profile.expectedReorder} />预计可补单</label>
                <textarea name="adminNote" defaultValue={profile.adminNote ?? ""} placeholder="后台备注" className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
                <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
              </form>
            </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无机会资料。请先用作品 ID 创建。</div>}
      </section>
    </div>
  );
}
