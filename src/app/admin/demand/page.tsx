import Link from "next/link";
import { WorkDemandIntentStatus } from "@prisma/client";
import { demandSummary } from "@/lib/demand/rules";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { maskUserContact } from "@/lib/user-contact";

export const dynamic = "force-dynamic";

export default async function AdminDemandPage() {
  const enabled = await isFeatureEnabled("feature.demand_v21");
  const demands = enabled
    ? await prisma.workDemandIntent.findMany({
        where: { status: WorkDemandIntentStatus.ACTIVE },
        include: {
          user: { select: { nickname: true, email: true, phone: true } },
          work: { select: { id: true, title: true, user: { select: { nickname: true } } } }
        },
        orderBy: { updatedAt: "desc" },
        take: 200
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">需求意向管理</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">仅汇总用户对公开优质作品的想买意向，不自动创建订单或项目。</p>
      </header>

      {!enabled ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm text-ink/55">Demand V2.1 功能开关未开启。</div>
      ) : demands.length ? (
        <div className="space-y-3">
          {demands.map((demand) => (
            <article key={demand.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-ink">{demand.work.title}</h2>
                  <p className="mt-1 text-sm text-ink/50">设计师：{demand.work.user.nickname}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/58">{demandSummary(demand)}</p>
                  <p className="mt-2 text-xs text-ink/42">用户：{demand.user.nickname} / {maskUserContact(demand.user)}</p>
                </div>
                <Link href={`/works/${demand.workId}`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
                  查看作品
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无需求意向。</div>
      )}
    </div>
  );
}
