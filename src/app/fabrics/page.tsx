import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fabricCoverUrl, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

export default async function FabricsPage() {
  const fabrics = await prisma.fabric.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Fabric Library</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">面料库</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">展示可用于作品孵化的面料信息，本阶段只做展示和推荐，不做在线询价与交易。</p>
      </header>

      {fabrics.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fabrics.map((fabric) => (
            <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
              <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  {fabric.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐</span> : null}
                  {fabric.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
                </div>
                <h2 className="line-clamp-2 text-lg font-semibold text-ink">{fabric.name}</h2>
                <p className="text-sm leading-6 text-ink/52">{[fabric.composition, fabric.weight, fabric.width].filter(Boolean).join(" / ") || "参数待补充"}</p>
                <p className="text-xs font-semibold text-ink/40">
                  {fabric.usage ?? "适用方向待补充"} / {fabric.provider ? `${fabric.provider.name} · ${PROVIDER_TYPE_LABELS[fabric.provider.type]}` : "供应商待关联"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无面料数据，后台新增面料后会显示在这里。</div>
      )}
    </div>
  );
}
