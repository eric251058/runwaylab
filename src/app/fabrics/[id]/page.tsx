import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fabricCoverUrl, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

type FabricDetailPageProps = {
  params: Promise<{ id: string }>;
};

function field(label: string, value?: string | null) {
  return <div className="rounded-[8px] border border-black/8 bg-white p-4"><p className="text-xs font-semibold text-ink/35">{label}</p><p className="mt-2 text-sm font-semibold text-ink">{value || "待补充"}</p></div>;
}

export default async function FabricDetailPage({ params }: FabricDetailPageProps) {
  const { id } = await params;
  const fabric = await prisma.fabric.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "ACTIVE" },
    include: {
      provider: true,
      recommendations: {
        include: { work: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  if (!fabric) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="aspect-[4/3] w-full rounded-[8px] object-cover shadow-[0_16px_48px_rgba(16,16,16,0.08)]" />
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Fabric</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{fabric.name}</h1>
          <p className="mt-4 text-sm leading-6 text-ink/58">{fabric.description ?? "面料说明待补充"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {fabric.isFeatured ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">推荐面料</span> : null}
            {fabric.tags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
          </div>
          {fabric.provider ? (
            <Link href={`/providers/${fabric.provider.slug ?? fabric.provider.id}`} className="mt-5 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">
              供应商：{fabric.provider.name} / {PROVIDER_TYPE_LABELS[fabric.provider.type]}
            </Link>
          ) : null}
          <p className="mt-5 rounded-[8px] bg-paper p-4 text-sm leading-6 text-ink/58">如需推荐给作品，可由后台在“面料推荐”中选择作品和面料。本阶段不做在线询价或交易。</p>
        </section>
      </div>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field("编号", fabric.code)}
        {field("成分", fabric.composition)}
        {field("克重", fabric.weight)}
        {field("门幅", fabric.width)}
        {field("颜色", fabric.color)}
        {field("肌理", fabric.texture)}
        {field("适用季节", fabric.season)}
        {field("适用品类", fabric.usage)}
        {field("价格说明", fabric.priceNote)}
        {field("MOQ", fabric.moqNote)}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold text-ink">已推荐给作品</h2>
        {fabric.recommendations.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {fabric.recommendations.map((recommendation) => (
              <Link key={recommendation.id} href={`/works/${recommendation.workId}`} className="rounded-[8px] border border-black/8 bg-white p-4">
                <h3 className="font-semibold text-ink">{recommendation.work.title}</h3>
                <p className="mt-2 text-sm text-ink/52">{recommendation.reason ?? "推荐理由待补充"} / {recommendation.status}</p>
              </Link>
            ))}
          </div>
        ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无作品推荐记录。</div>}
      </section>
    </div>
  );
}
