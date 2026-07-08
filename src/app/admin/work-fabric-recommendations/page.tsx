import { RecommendationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveWorkFabricRecommendation } from "@/lib/provider-market-admin";

export const dynamic = "force-dynamic";

export default async function AdminWorkFabricRecommendationsPage() {
  const [recommendations, fabrics, providers] = await Promise.all([
    prisma.workFabricRecommendation.findMany({ include: { work: true, fabric: true, provider: true }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.fabric.findMany({ include: { provider: true }, orderBy: { name: "asc" } }),
    prisma.provider.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">面料推荐</h1>
      </header>
      <form action={saveWorkFabricRecommendation} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="workId" required placeholder="作品 ID" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="fabricId" required className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择面料</option>
          {fabrics.map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.name}{fabric.provider ? ` / ${fabric.provider.name}` : ""}</option>)}
        </select>
        <select name="providerId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">使用面料供应商</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
        <select name="status" defaultValue={RecommendationStatus.PENDING} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(RecommendationStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <input name="recommendedBy" defaultValue="ADMIN" placeholder="推荐来源" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <textarea name="reason" placeholder="推荐理由" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">生成面料推荐</button>
      </form>

      <section className="mt-8 space-y-3">
        {recommendations.length ? recommendations.map((item) => (
          <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <h2 className="font-semibold text-ink">{item.work.title} / {item.fabric.name}</h2>
            <p className="mt-1 text-sm text-ink/52">{item.provider?.name ?? item.fabric.providerId ?? "供应商待关联"} / {item.status}</p>
            <p className="mt-2 text-sm leading-6 text-ink/58">{item.reason ?? "推荐理由待补充"}</p>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无推荐记录。</div>}
      </section>
    </div>
  );
}
