import Link from "next/link";
import { redirect } from "next/navigation";
import { PresaleCampaignIntentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { cancelOwnPresaleCampaignIntent } from "@/lib/presale-campaign-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<PresaleCampaignIntentStatus, string> = {
  SUBMITTED: "待平台跟进",
  CONTACTED: "正在沟通",
  CONFIRMED: "意向已确认",
  CANCELLED: "已取消"
};

const statusStyles: Record<PresaleCampaignIntentStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-800",
  CONTACTED: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-black/5 text-ink/45"
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function MyPresaleIntentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/presale");

  const intents = await prisma.presaleCampaignIntent.findMany({
    where: { userId: user.id },
    include: {
      campaign: {
        select: {
          title: true,
          status: true,
          estimatedPrice: true,
          targetCount: true,
          currentCount: true
        }
      },
      work: {
        select: {
          id: true,
          title: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { imageUrl: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const activeCount = intents.filter((item) => item.status !== PresaleCampaignIntentStatus.CANCELLED).length;
  const confirmedCount = intents.filter((item) => item.status === PresaleCampaignIntentStatus.CONFIRMED).length;
  const totalQuantity = intents
    .filter((item) => item.status !== PresaleCampaignIntentStatus.CANCELLED)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Presale Intents</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">我的预售意向</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">跟踪你感兴趣的作品。当前阶段不收款，也不构成正式订单。</p>
        </div>
        <Link href="/presale" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          浏览预售作品
        </Link>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-2">
        {[
          ["进行中", activeCount],
          ["已确认", confirmedCount],
          ["意向件数", totalQuantity]
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-black/8 bg-white p-3 md:p-4">
            <p className="text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
          </div>
        ))}
      </section>

      {intents.length ? (
        <section className="grid gap-4">
          {intents.map((intent) => {
            const progress = intent.campaign.targetCount
              ? Math.min(100, Math.round((intent.campaign.currentCount / intent.campaign.targetCount) * 100))
              : 0;
            return (
              <article key={intent.id} className="overflow-hidden rounded-[10px] border border-black/8 bg-white">
                <div className="grid md:grid-cols-[160px_1fr]">
                  <div className="aspect-[4/3] bg-paper md:aspect-auto">
                    {intent.work.images[0]?.imageUrl ? (
                      <img src={intent.work.images[0].imageUrl} alt={intent.work.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-32 items-center justify-center text-sm text-ink/35">暂无作品图</div>
                    )}
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[intent.status]}`}>
                        {statusLabels[intent.status]}
                      </span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/50">{intent.quantity} 件</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-ink">
                      <Link href={`/works/${intent.work.id}`} className="hover:text-ink/65">{intent.campaign.title}</Link>
                    </h2>
                    <p className="mt-1 text-sm text-ink/48">提交于 {formatDate(intent.createdAt)}</p>
                    <div className="mt-4 grid gap-2 text-sm text-ink/58 sm:grid-cols-2">
                      <p>尺码：{intent.size || "待确认"}</p>
                      <p>颜色：{intent.color || "待确认"}</p>
                      <p>预计价格：{intent.campaign.estimatedPrice || "待确认"}</p>
                      <p>活动状态：{intent.campaign.status}</p>
                    </div>
                    {intent.status !== PresaleCampaignIntentStatus.CANCELLED ? (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold text-ink/45">
                          <span>需求验证进度</span>
                          <span>{intent.campaign.currentCount} / {intent.campaign.targetCount}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-[6px] bg-paper p-3 text-sm text-ink/50">该意向已取消，不再计入作品需求数量。</p>
                    )}
                      {intent.status === PresaleCampaignIntentStatus.SUBMITTED ||
                      intent.status === PresaleCampaignIntentStatus.CONTACTED ? (
                        <details className="mt-4 border-t border-black/8 pt-4">
                          <summary className="cursor-pointer text-sm font-semibold text-ink/52">管理我的意向</summary>
                          <div className="mt-3 rounded-[6px] bg-paper p-3">
                            <p className="text-sm leading-6 text-ink/55">
                              撤回后，本次意向数量将立即从需求进度中扣除。若之后再次感兴趣，需要联系平台恢复。
                            </p>
                            <form action={cancelOwnPresaleCampaignIntent} className="mt-3">
                              <input type="hidden" name="id" value={intent.id} />
                              <button type="submit" className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
                                确认撤回意向
                              </button>
                            </form>
                          </div>
                        </details>
                      ) : intent.status === PresaleCampaignIntentStatus.CONFIRMED ? (
                        <p className="mt-4 text-xs leading-5 text-ink/42">
                          该意向已经确认。如需变更，请联系平台，避免影响后续打样与交付安排。
                        </p>
                      ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          你还没有提交预售意向。先浏览正在验证的作品，遇到真正愿意购买的设计再表达兴趣。
        </section>
      )}
    </main>
  );
}
