import Link from "next/link";
import { ProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PROVIDER_TYPE_LABELS, maskContact, providerCoverUrl, providerLogoUrl } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

function Empty() {
  return <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">平台正在补充首批认证服务商信息。</div>;
}

export default async function ProvidersPage() {
  const providers = await prisma.provider.findMany({
    where: {
      status: "ACTIVE"
    },
    include: {
      _count: {
        select: {
          fabrics: true,
          workProposals: true
        }
      }
    },
    orderBy: [{ isFeatured: "desc" }, { isVerified: "desc" }, { createdAt: "desc" }]
  });

  const groups = Object.values(ProviderType).map((type) => ({
    type,
    label: PROVIDER_TYPE_LABELS[type],
    providers: providers.filter((provider) => provider.type === type)
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Network</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商市场</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">连接面料商、打样工作室、服装工厂和买手采购资源，为优秀设计作品提供可落地的服务商方案。</p>
        </div>
        <Link href="/providers/apply" className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">服务商入驻</Link>
      </header>

      {providers.length ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.type}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-ink">{group.label}</h2>
                <span className="text-sm font-semibold text-ink/35">{group.providers.length} 家</span>
              </div>
              {group.providers.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.providers.map((provider) => (
                    <Link key={provider.id} href={`/providers/${provider.slug ?? provider.id}`} className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
                      <img src={providerCoverUrl(provider.coverUrl)} alt={provider.name} className="aspect-[16/9] w-full object-cover" />
                      <div className="space-y-3 p-5">
                        <div className="flex items-start gap-3">
                          <img src={providerLogoUrl(provider.logoUrl)} alt={provider.name} className="size-12 rounded-[6px] object-cover" />
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-1 text-xl font-semibold text-ink">{provider.name}</h3>
                            <p className="mt-1 text-sm text-ink/52">{[provider.province, provider.city].filter(Boolean).join(" / ") || "城市待补充"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {provider.isVerified ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">认证服务商</span> : null}
                          {provider.isFeatured ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">平台协作服务商</span> : null}
                          {provider.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-ink/58">{provider.description ?? "可参与作品孵化方案，提供面料、打样、生产或买手反馈支持。"}</p>
                        <p className="text-xs font-semibold text-ink/40">面料 {provider._count.fabrics} / 服务商方案 {provider._count.workProposals} / {maskContact(provider.contactPhone ?? provider.contactEmail ?? provider.wechat)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </section>
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </div>
  );
}
