import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fabricCoverUrl, maskContact, providerCoverUrl, providerLogoUrl, PROVIDER_PROPOSAL_TYPE_LABELS, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

type ProviderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = await params;
  const provider = await prisma.provider.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      status: "ACTIVE"
    },
    include: {
      fabrics: {
        where: { status: "ACTIVE" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 8
      },
      workProposals: {
        include: { work: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      },
      _count: { select: { workProposals: true, fabrics: true } }
    }
  });

  if (!provider) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="overflow-hidden rounded-[8px] bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
        <img src={providerCoverUrl(provider.coverUrl)} alt={provider.name} className="aspect-[16/7] w-full object-cover" />
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <img src={providerLogoUrl(provider.logoUrl)} alt={provider.name} className="size-20 rounded-[8px] object-cover" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">{PROVIDER_TYPE_LABELS[provider.type]}</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{provider.name}</h1>
              <p className="mt-3 text-sm text-ink/52">{[provider.province, provider.city, provider.country].filter(Boolean).join(" / ")}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {provider.isVerified ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">已认证</span> : null}
            {provider.isFeatured ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">推荐服务商</span> : null}
            {provider.tags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-ink/60">{provider.description ?? "服务商简介待补充"}</p>
          <div className="mt-5 grid gap-3 text-sm text-ink/58 md:grid-cols-3">
            <div className="rounded-[8px] bg-paper p-4">联系人：{provider.contactName ?? "待补充"}</div>
            <div className="rounded-[8px] bg-paper p-4">电话：{maskContact(provider.contactPhone)}</div>
            <div className="rounded-[8px] bg-paper p-4">邮箱/微信：{maskContact(provider.contactEmail ?? provider.wechat)}</div>
          </div>
          {provider.website ? <a href={provider.website} className="mt-5 inline-flex text-sm font-semibold text-ink underline">访问官网</a> : null}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.82fr]">
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">关联面料</h2>
          {provider.fabrics.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {provider.fabrics.map((fabric) => (
                <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="flex gap-3 rounded-[8px] border border-black/8 bg-white p-3">
                  <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="size-20 rounded-[6px] object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{fabric.name}</span>
                    <span className="mt-1 block text-sm text-ink/52">{[fabric.composition, fabric.weight, fabric.width].filter(Boolean).join(" / ") || "参数待补充"}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无关联面料。</div>}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-ink">提交过的方案</h2>
          {provider.workProposals.length ? (
            <div className="space-y-3">
              {provider.workProposals.map((proposal) => (
                <article key={proposal.id} className="rounded-[8px] border border-black/8 bg-white p-4">
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_PROPOSAL_TYPE_LABELS[proposal.type]}</span>
                  <h3 className="mt-3 font-semibold text-ink">{proposal.title}</h3>
                  <p className="mt-1 text-sm text-ink/52">关联作品：<Link href={`/works/${proposal.workId}`} className="underline">{proposal.work.title}</Link></p>
                  <p className="mt-2 text-sm text-ink/52">{proposal.status}</p>
                </article>
              ))}
            </div>
          ) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务方案。</div>}
        </section>
      </div>
    </div>
  );
}
