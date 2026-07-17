import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkDemandIntentStatus } from "@prisma/client";
import { SafeImage } from "@/components/media/SafeImage";
import { getCurrentUser } from "@/lib/auth/session";
import { demandSummary } from "@/lib/demand/rules";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeWantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/wants");

  const enabled = await isFeatureEnabled("feature.demand_v21");
  if (!enabled) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="text-3xl font-semibold text-ink md:text-5xl">我的想买意向</h1>
        <p className="mt-4 rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/58">想买意向功能尚未开放，当前不会影响已上线功能。</p>
      </div>
    );
  }

  const demands = await prisma.workDemandIntent.findMany({
    where: { userId: user.id, status: WorkDemandIntentStatus.ACTIVE },
    include: {
      work: {
        include: {
          user: { select: { nickname: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 80
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Wants</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">我的想买意向</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">这里仅记录你对作品的兴趣，不会产生订单或付款。</p>
      </header>

      {demands.length ? (
        <div className="space-y-3">
          {demands.map((demand) => (
            <Link key={demand.id} href={`/works/${demand.workId}`} className="flex gap-3 rounded-[8px] border border-black/8 bg-white p-3 transition hover:border-ink/35">
              <SafeImage src={demand.work.images[0]?.imageUrl ?? null} alt={demand.work.title} className="aspect-[4/3] w-24 shrink-0 rounded-[6px] object-cover" placeholder="暂无图片" />
              <span className="min-w-0 py-1">
                <span className="block truncate text-sm font-semibold text-ink">{demand.work.title}</span>
                <span className="mt-1 block truncate text-xs text-ink/45">{demand.work.user.nickname}</span>
                <span className="mt-2 block line-clamp-2 text-sm leading-6 text-ink/56">{demandSummary(demand)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/55">
          你还没有提交想买意向。可以先去作品库浏览喜欢的设计。
          <div className="mt-4">
            <Link href="/works" className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
              浏览作品
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
