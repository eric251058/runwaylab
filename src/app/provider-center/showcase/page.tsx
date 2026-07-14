import Link from "next/link";
import { redirect } from "next/navigation";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";
import { PROVIDER_SHOWCASE_STATUS_LABELS, PROVIDER_SHOWCASE_TYPE_LABELS, visibleImage } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export default async function ProviderCenterShowcasePage() {
  const { provider } = await getProviderCenterContext("/provider-center/showcase");
  if (!provider) redirect("/providers/apply");

  const items = await prisma.providerShowcaseItem.findMany({
    where: { providerId: provider.id },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">SHOWCASE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">管理案例</h1>
          <p className="mt-3 text-sm text-ink/52">用于打样案例、生产案例和专业服务展示。面料仍请放在面料管理。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
          <Link href="/provider-center/showcase/new" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">新增案例</Link>
        </div>
      </header>

      {items.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const image = visibleImage(item.coverImageUrl);
            return (
              <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-3">
                {image ? <img src={image} alt={item.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/35">案例</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_SHOWCASE_TYPE_LABELS[item.type]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_SHOWCASE_STATUS_LABELS[item.status]}</span>
                </div>
                <h2 className="mt-3 truncate font-semibold text-ink">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/52">{item.summary || item.category || "案例说明待补充"}</p>
                {item.reviewNote ? <p className="mt-2 rounded-[6px] bg-paper p-2 text-xs leading-5 text-ink/50">审核备注：{item.reviewNote}</p> : null}
                <div className="mt-4 flex gap-2">
                  {item.status === "PUBLISHED" ? <Link href={`/providers/${provider.slug ?? provider.id}/showcase/${item.id}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">公开页</Link> : null}
                  <Link href={`/provider-center/showcase/${item.id}/edit`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">编辑</Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">还没有案例。你可以先保存草稿，再提交平台审核。</div>
      )}
    </div>
  );
}
