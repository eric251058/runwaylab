import Link from "next/link";
import { PresaleCampaignIntentStatus, PresaleCampaignStatus, ProjectDesignAuthorizationStatus } from "@prisma/client";
import { savePresaleCampaign } from "@/lib/presale-campaign-actions";
import { PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";
import { LIMITED_PREORDER_STATUS_LABELS } from "@/lib/projects/preorder-lifecycle";
import { isPublicQualityWork } from "@/lib/works/rules";

export const dynamic = "force-dynamic";

function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPresaleCampaignsPage() {
  const [campaigns, works, eligibleProjects] = await Promise.all([
    prisma.presaleCampaign.findMany({
      include: {
        work: { include: { user: true } },
        createdBy: true,
        collaborationProjects: {
          select: { id: true, slug: true, title: true }
        },
        intents: { select: { status: true, quantity: true } },
        _count: { select: { intents: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 120
    }),
    prisma.work.findMany({
      include: {
        user: true,
        images: {
          select: { imageUrl: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.collaborationProject.findMany({
      where: {
        workId: { not: null },
        designerAuthorizationStatus: ProjectDesignAuthorizationStatus.ACCEPTED
      },
      select: {
        id: true,
        title: true,
        workId: true,
        presaleCampaignId: true,
        work: { select: { title: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    })
  ]);

  const publicEligibleWorkIds = new Set(works.filter(isPublicQualityWork).map((work) => work.id));
  const inputClass = "h-11 rounded-[6px] border border-black/10 px-3 text-sm";
  const smallInputClass = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">预售活动管理</h1>
        </div>
        <Link href="/admin/presale-intents" className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
          查看预售意向
        </Link>
      </header>

      <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        这里管理 V2.1 需求验证资料；V2.3 限量预售使用独立状态机并在项目工作台操作。只有已审核、公开可见且资料完整的作品才能进入“验证中”。
      </div>

      <form action={savePresaleCampaign} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="workId" required className={inputClass}>
          <option value="">选择作品</option>
          {works.map((work) => {
            const eligible = publicEligibleWorkIds.has(work.id);
            return (
              <option key={work.id} value={work.id}>
                {work.title} / {work.user.nickname} / {eligible ? "可公开验证" : "仅可保存草稿"}
              </option>
            );
          })}
        </select>
        <input name="title" required placeholder="预售活动标题" className={inputClass} />
        <input name="slug" placeholder="slug，可选" className={inputClass} />
        <select name="status" defaultValue={PresaleCampaignStatus.DRAFT} className={inputClass}>
          {Object.values(PresaleCampaignStatus).map((status) => (
            <option key={status} value={status}>
              {PRESALE_CAMPAIGN_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select name="collaborationProjectId" className={inputClass}>
          <option value="">选择已授权协作项目（公开验证前必选）</option>
          {eligibleProjects.map((project) => (
            <option key={project.id} value={project.id} disabled={Boolean(project.presaleCampaignId)}>
              {project.work?.title ?? "未命名作品"} / {project.title}{project.presaleCampaignId ? " / 已关联" : ""}
            </option>
          ))}
        </select>
        <input name="targetCount" type="number" min={1} defaultValue={50} placeholder="目标人数" className={inputClass} />
        <input name="estimatedPrice" placeholder="预计价格，例如 ¥699-899" className={inputClass} />
        <input name="priceNote" placeholder="价格说明，可选" className={inputClass} />
        <input name="sizeOptions" placeholder="尺码，逗号分隔，例如 S,M,L" className={inputClass} />
        <input name="colorOptions" placeholder="颜色，逗号分隔，例如 黑色,白色" className={inputClass} />
        <input name="startDate" type="date" className={inputClass} />
        <input name="endDate" type="date" className={inputClass} />
        <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" />推荐</label>
        <textarea name="description" placeholder="预售说明" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增预售活动</button>
      </form>

      <section className="mt-8 space-y-3">
        {campaigns.length ? campaigns.map((campaign) => {
          const progress = presaleProgress(campaign.currentCount, campaign.targetCount);
          const publicEligible = publicEligibleWorkIds.has(campaign.workId);
          const confirmedIntents = campaign.intents.filter((intent) => intent.status === PresaleCampaignIntentStatus.CONFIRMED);
          const confirmedQuantity = confirmedIntents.reduce((total, intent) => total + intent.quantity, 0);
          const confirmationRate = campaign.currentCount > 0 ? Math.round((confirmedQuantity / campaign.currentCount) * 100) : 0;
          const targetReached = confirmedQuantity >= campaign.targetCount;
          const decisionLabel = targetReached
            ? "确认需求已达到目标，可评估打样或预订准备。"
            : confirmedQuantity > 0
              ? "已有确认需求，继续跟进并验证履约条件。"
              : campaign.currentCount > 0
                ? "已有意向，等待人工确认后再推进。"
                : "继续收集市场信号，暂不进入履约。";
          const linkedProject = campaign.collaborationProjects[0] ?? null;
          const lifecycleLocked = campaign.preorderStatus !== "NOT_STARTED";
          return (
            <form key={campaign.id} action={savePresaleCampaign} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
              <input type="hidden" name="id" value={campaign.id} />
              <select name="workId" defaultValue={campaign.workId} className={smallInputClass}>
                {works.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.title} / {work.user.nickname}
                  </option>
                ))}
              </select>
              <input name="title" defaultValue={campaign.title} className={smallInputClass} />
              <input name="slug" defaultValue={campaign.slug ?? ""} placeholder="slug" className={smallInputClass} />
              <select name="status" defaultValue={campaign.status} className={smallInputClass}>
                {Object.values(PresaleCampaignStatus).map((status) => (
                  <option key={status} value={status}>
                    {PRESALE_CAMPAIGN_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <select name="collaborationProjectId" defaultValue={campaign.collaborationProjects[0]?.id ?? ""} className={smallInputClass}>
                <option value="">选择已授权协作项目</option>
                {eligibleProjects.map((project) => (
                  <option key={project.id} value={project.id} disabled={Boolean(project.presaleCampaignId && project.presaleCampaignId !== campaign.id)}>
                    {project.work?.title ?? "未命名作品"} / {project.title}
                    {project.presaleCampaignId && project.presaleCampaignId !== campaign.id ? " / 已关联其他活动" : ""}
                  </option>
                ))}
              </select>
              <input name="targetCount" type="number" min={1} defaultValue={campaign.targetCount} className={smallInputClass} />
              <input name="estimatedPrice" defaultValue={campaign.estimatedPrice ?? ""} placeholder="预计价格" className={smallInputClass} />
              <input name="priceNote" defaultValue={campaign.priceNote ?? ""} placeholder="价格说明" className={smallInputClass} />
              <input name="sizeOptions" defaultValue={campaign.sizeOptions.join(", ")} placeholder="尺码" className={smallInputClass} />
              <input name="colorOptions" defaultValue={campaign.colorOptions.join(", ")} placeholder="颜色" className={smallInputClass} />
              <input name="startDate" type="date" defaultValue={dateInputValue(campaign.startDate)} className={smallInputClass} />
              <input name="endDate" type="date" defaultValue={dateInputValue(campaign.endDate)} className={smallInputClass} />
              <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={campaign.isFeatured} />推荐</label>
              <textarea name="description" defaultValue={campaign.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
              <button disabled={lifecycleLocked} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35">{lifecycleLocked ? "V2.3 生命周期中已锁定" : "保存需求验证资料"}</button>
              <p className="text-xs leading-5 text-ink/45 md:col-span-4">
                作品：{campaign.work.title} / 创建人：{campaign.createdBy?.nickname ?? "后台"} / 意向 {campaign._count.intents} 条 / 当前 {campaign.currentCount} / {campaign.targetCount}（{progress}%）
              </p>
              <p className="text-xs leading-5 text-ink/45 md:col-span-4">
                承接项目：{campaign.collaborationProjects.length
                  ? campaign.collaborationProjects.map((project) => project.title).join("、")
                  : "尚未关联；公开验证前必须选择一个已取得设计授权的协作项目。"}
              </p>
              <p className="text-xs font-semibold leading-5 text-ink/55 md:col-span-4">V2.3 限量预售：{LIMITED_PREORDER_STATUS_LABELS[campaign.preorderStatus]}</p>
              <div className="grid gap-3 rounded-[8px] bg-paper p-4 md:col-span-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-center">
                <div>
                  <p className="text-xs font-semibold text-ink/40">有效意向数量</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{campaign.currentCount}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink/40">人工确认数量</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{confirmedQuantity}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink/40">确认率</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{confirmationRate}%</p>
                </div>
                {linkedProject ? (
                  <div className="flex flex-col gap-2">
                    <Link href={"/projects/" + (linkedProject.slug ?? linkedProject.id)} className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">
                      打开承接项目
                    </Link>
                    <Link href={"/admin/projects/" + linkedProject.id + "/preorder"} className="inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">准备限量预订 / 进入工作台</Link>
                  </div>
                ) : null}
                <p className={"text-sm font-semibold leading-6 md:col-span-4 " + (targetReached ? "text-emerald-700" : "text-ink/55")}>
                  {decisionLabel}
                </p>
                <p className="text-xs leading-5 text-ink/40 md:col-span-4">决策提示仅基于未付款意向与人工确认数据，不会自动创建订单、生产任务或收入记录。</p>
              </div>
              <p className={"text-xs font-semibold md:col-span-4 " + (publicEligible ? "text-emerald-700" : "text-amber-700")}>
                {publicEligible ? "前台可见：作品已通过公开质量门槛。" : "前台隐藏：作品未达到公开质量门槛，只能保存为草稿。"}
              </p>
            </form>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预售活动。</div>}
      </section>
    </div>
  );
}
