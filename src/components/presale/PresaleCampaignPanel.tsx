import Link from "next/link";
import { PresaleCampaignForm } from "@/components/presale/PresaleCampaignForm";
import { formatPresaleDate, PRESALE_CAMPAIGN_STATUS_LABELS, presaleProgress } from "@/lib/presale-campaign";
import type { PresaleCampaignStatus } from "@prisma/client";

type PresaleCampaignPanelProps = {
  campaign: {
    id: string;
    workId: string;
    title: string;
    description?: string | null;
    targetCount: number;
    currentCount: number;
    estimatedPrice?: string | null;
    priceNote?: string | null;
    sizeOptions: string[];
    colorOptions: string[];
    startDate?: Date | null;
    endDate?: Date | null;
    status: PresaleCampaignStatus;
  } | null;
  workTitle: string;
  source: "WORK_DETAIL" | "PRESALE_PAGE";
  compact?: boolean;
};

function optionText(values: string[]) {
  return values.length ? values.join(" / ") : "暂未限定";
}

export function PresaleCampaignPanel({ campaign, workTitle, source, compact = false }: PresaleCampaignPanelProps) {
  if (!campaign) {
    return (
      <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Presale Validation</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">预售验证</h2>
        <p className="mt-3 text-sm leading-6 text-ink/58">该作品暂未开启预售验证。进入孵化候选后，设计师或平台可开启目标人数、尺码、颜色和预计价格验证。</p>
      </section>
    );
  }

  const progress = presaleProgress(campaign.currentCount, campaign.targetCount);

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Presale Validation</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{campaign.title}</h2>
          <p className="mt-2 text-sm font-semibold text-ink/50">{workTitle}</p>
        </div>
        <span className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{PRESALE_CAMPAIGN_STATUS_LABELS[campaign.status]}</span>
      </div>

      {campaign.description ? <p className="mt-4 text-sm leading-6 text-ink/62">{campaign.description}</p> : null}
      <p className="mt-3 rounded-[6px] bg-paper px-4 py-3 text-sm leading-6 text-ink/58">
        这是预售意向验证，不收款，不构成订单。提交后只表示你对这件作品感兴趣，平台会在作品进入打样或预售阶段后联系确认。
      </p>

      <div className="mt-5">
        <div className="mb-2 flex flex-col gap-1 text-xs font-semibold text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <span>已有 {campaign.currentCount} 人表达意向，目标 {campaign.targetCount} 人</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[6px] bg-paper p-3">
          <p className="text-xs font-semibold text-ink/42">预计价格</p>
          <p className="mt-1 text-sm font-semibold text-ink">{campaign.estimatedPrice ?? "价格待定"}</p>
          {campaign.priceNote ? <p className="mt-1 text-xs leading-5 text-ink/52">{campaign.priceNote}</p> : null}
        </div>
        <div className="rounded-[6px] bg-paper p-3">
          <p className="text-xs font-semibold text-ink/42">验证时间</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatPresaleDate(campaign.startDate)} - {formatPresaleDate(campaign.endDate)}
          </p>
        </div>
        <div className="rounded-[6px] bg-paper p-3">
          <p className="text-xs font-semibold text-ink/42">尺码</p>
          <p className="mt-1 text-sm font-semibold text-ink">{optionText(campaign.sizeOptions)}</p>
        </div>
        <div className="rounded-[6px] bg-paper p-3">
          <p className="text-xs font-semibold text-ink/42">颜色</p>
          <p className="mt-1 text-sm font-semibold text-ink">{optionText(campaign.colorOptions)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[8px] border border-black/8 bg-paper p-4">
        <p className="mb-3 text-sm font-semibold text-ink">提交预售意向</p>
        <PresaleCampaignForm campaignId={campaign.id} workId={campaign.workId} source={source} sizeOptions={campaign.sizeOptions} colorOptions={campaign.colorOptions} />
        <p className="mt-3 text-xs leading-5 text-ink/45">当前仅收集市场意向，不收款、不生成订单、不涉及退款或物流。</p>
      </div>

      {!compact ? (
        <Link href="/presale" className="mt-4 inline-flex text-sm font-semibold text-ink/55 hover:text-ink">
          查看更多预售验证作品
        </Link>
      ) : null}
    </section>
  );
}
