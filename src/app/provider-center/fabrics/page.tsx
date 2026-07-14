import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderType } from "@prisma/client";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { fabricCoverUrl } from "@/lib/provider-market";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProviderCenterFabricsPage() {
  const { provider } = await getProviderCenterContext("/provider-center/fabrics");
  if (!provider) redirect("/providers/apply");

  const fabrics = await prisma.fabric.findMany({
    where: { providerId: provider.id },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">FABRICS</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">管理面料</h1>
          <p className="mt-3 text-sm text-ink/52">面料产品继续使用 RunwayLab 现有 Fabric 数据源。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
          {provider.type === ProviderType.FABRIC_SUPPLIER ? <Link href="/provider-center/fabrics/new" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">新增面料</Link> : null}
        </div>
      </header>

      {provider.type !== ProviderType.FABRIC_SUPPLIER ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">当前服务商类型不是面料商，暂不能创建面料产品。打样、工厂和专业服务请使用案例管理。</div>
      ) : fabrics.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fabrics.map((fabric) => (
            <article key={fabric.id} className="rounded-[8px] border border-black/8 bg-white p-3">
              <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
              <h2 className="mt-3 truncate font-semibold text-ink">{fabric.name}</h2>
              <p className="mt-1 text-sm text-ink/52">{fabric.status} / {fabric.usage || "适用品类待补充"}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/fabrics/${fabric.slug ?? fabric.id}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">公开页</Link>
                <Link href={`/provider-center/fabrics/${fabric.id}/edit`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">编辑</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">还没有面料产品。先新增 1 个可公开展示的面料，主页完整度也会提升。</div>
      )}
    </div>
  );
}
