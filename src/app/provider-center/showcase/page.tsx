import Link from "next/link";
import { redirect } from "next/navigation";
import { SafeImage } from "@/components/media/SafeImage";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";
import { PROVIDER_SHOWCASE_STATUS_LABELS, PROVIDER_SHOWCASE_TYPE_LABELS } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export default async function ProviderCenterShowcasePage() {
  const { provider } = await getProviderCenterContext("/provider-center/showcase");
  if (!provider) redirect("/providers/apply");
  const title = provider.type === "FACTORY" ? "管理生产案例" : provider.type === "SAMPLE_STUDIO" ? "管理打样案例" : "管理案例";
  const newLabel = provider.type === "FACTORY" ? "新增生产案例" : provider.type === "SAMPLE_STUDIO" ? "新增打样案例" : "新增案例";

  const items = await prisma.providerShowcaseItem.findMany({
    where: { providerId: provider.id },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">SHOWCASE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-ink/52">用于展示真实服务能力。面料供应商的产品仍请放在面料管理。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
          <Link href="/provider-center/showcase/new" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">{newLabel}</Link>
        </div>
      </header>

      {items.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            return (
              <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-3">
                <SafeImage src={item.coverImageUrl} alt={item.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" placeholder="案例图片" />
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
