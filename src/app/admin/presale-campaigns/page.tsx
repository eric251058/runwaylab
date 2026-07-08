import Link from "next/link";
import { PresaleCampaignStatus } from "@prisma/client";
import { savePresaleCampaign } from "@/lib/presale-campaign-actions";
import { PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPresaleCampaignsPage() {
  const [campaigns, works] = await Promise.all([
    prisma.presaleCampaign.findMany({
      include: {
        work: { include: { user: true } },
        createdBy: true,
        _count: { select: { intents: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 120
    }),
    prisma.work.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  ]);

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

      <form action={savePresaleCampaign} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="workId" required className={inputClass}>
          <option value="">选择作品</option>
          {works.map((work) => (
            <option key={work.id} value={work.id}>
              {work.title} / {work.user.nickname}
            </option>
          ))}
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
              <input name="targetCount" type="number" min={1} defaultValue={campaign.targetCount} className={smallInputClass} />
              <input name="estimatedPrice" defaultValue={campaign.estimatedPrice ?? ""} placeholder="预计价格" className={smallInputClass} />
              <input name="priceNote" defaultValue={campaign.priceNote ?? ""} placeholder="价格说明" className={smallInputClass} />
              <input name="sizeOptions" defaultValue={campaign.sizeOptions.join(", ")} placeholder="尺码" className={smallInputClass} />
              <input name="colorOptions" defaultValue={campaign.colorOptions.join(", ")} placeholder="颜色" className={smallInputClass} />
              <input name="startDate" type="date" defaultValue={dateInputValue(campaign.startDate)} className={smallInputClass} />
              <input name="endDate" type="date" defaultValue={dateInputValue(campaign.endDate)} className={smallInputClass} />
              <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={campaign.isFeatured} />推荐</label>
              <textarea name="description" defaultValue={campaign.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
              <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
              <p className="text-xs leading-5 text-ink/45 md:col-span-4">
                作品：{campaign.work.title} / 创建人：{campaign.createdBy?.nickname ?? "后台"} / 意向 {campaign._count.intents} 条 / 当前 {campaign.currentCount} / {campaign.targetCount}（{progress}%）
              </p>
            </form>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无预售活动。</div>}
      </section>
    </div>
  );
}
