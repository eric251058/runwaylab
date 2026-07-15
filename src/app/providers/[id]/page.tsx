import Link from "next/link";
import { notFound } from "next/navigation";
import { FabricStatus, ProviderShowcaseStatus } from "@prisma/client";
import { ProviderInquiryForm } from "@/components/providers/ProviderInquiryForm";
import { getCurrentUser } from "@/lib/auth/session";
import { fabricCoverUrl } from "@/lib/provider-market";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_AVAILABILITY_LABELS,
  PROVIDER_SHOWCASE_TYPE_LABELS,
  SUPPLY_PROVIDER_TYPE_LABELS,
  getProviderFitTags,
  getProviderTags,
  listText,
  providerBelongsToUser,
  providerDisplayImage,
  providerPublicUrl,
  publicProviderWhere,
  visibleImage
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

type ProviderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function infoItem(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/35">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function heroFact(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  return label ? `${label} ${value}` : String(value);
}

export default async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const provider = await prisma.provider.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      ...publicProviderWhere()
    },
    include: {
      fabrics: {
        where: { status: FabricStatus.ACTIVE },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 12
      },
      showcaseItems: {
        where: { status: ProviderShowcaseStatus.PUBLISHED },
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 12
      },
      _count: { select: { fabrics: true, showcaseItems: true, inquiries: true } }
    }
  });

  if (!provider) notFound();

  const isOwner = providerBelongsToUser(provider, user);
  const contactVisible = Boolean(user && provider.publicContactEnabled);
  const heroImage = providerDisplayImage(provider);
  const tags = getProviderTags(provider, 8);
  const fitTags = getProviderFitTags(provider);
  const heroFacts = [
    heroFact("MOQ", provider.moqMin ?? provider.minimumOrderQuantity),
    heroFact("打样", provider.sampleLeadDays ? `${provider.sampleLeadDays} 天` : null),
    heroFact("生产", provider.productionLeadDays ? `${provider.productionLeadDays} 天` : null),
    provider.acceptsSmallBatch ? heroFact("", "可接小单") : null,
    provider.acceptsLargeOrder ? heroFact("", "可接大货") : null
  ].filter((fact): fact is string => Boolean(fact));
  const workOptions = user
    ? await prisma.work.findMany({
        where: { userId: user.id },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 30
      })
    : [];
  const publicUrl = providerPublicUrl(provider);
  const loginHref = `/login?next=${encodeURIComponent(`${publicUrl}#inquiry`)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="grid gap-6 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[0.9fr_1.1fr] md:p-6">
        {heroImage ? (
          <img src={heroImage} alt={provider.name} className="aspect-[16/10] w-full rounded-[8px] object-cover" />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[8px] bg-paper text-5xl font-semibold text-ink/30">{provider.name.slice(0, 1)}</div>
        )}
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PROVIDER PROFILE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{provider.name}</h1>
          <p className="mt-3 text-sm text-ink/52">
            {[SUPPLY_PROVIDER_TYPE_LABELS[provider.type], provider.city, provider.isVerified ? "已认证" : null, PROVIDER_AVAILABILITY_LABELS[provider.availabilityStatus]].filter(Boolean).join(" / ")}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">{provider.tagline || provider.description || "为优秀设计作品提供材料、打样、生产或专业服务支持。"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {provider.isVerified ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">认证服务商</span> : null}
            {tags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
          </div>
          {heroFacts.length ? (
            <div className="mt-5 grid gap-2 text-sm font-semibold sm:grid-cols-3">
              {heroFacts.map((fact) => (
                <span key={fact} className="rounded-[6px] bg-paper p-3">{fact}</span>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#inquiry" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">发起合作</a>
            <a href="#products" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">查看产品与案例</a>
            {isOwner ? <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">管理我的主页</Link> : null}
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {infoItem("擅长品类", listText(provider.categories.length ? provider.categories : provider.specialties, ""))}
        {infoItem("擅长材料", listText(provider.materials, ""))}
        {infoItem("擅长工艺", listText(provider.techniques, ""))}
        {infoItem("服务地区", listText(provider.serviceRegions, ""))}
        {infoItem("小单承接", provider.acceptsSmallBatch ? "可承接" : null)}
        {infoItem("大货承接", provider.acceptsLargeOrder ? "可承接" : null)}
        {infoItem("生产周期", provider.productionLeadDays ? `${provider.productionLeadDays} 天` : null)}
        {infoItem("产能说明", provider.capacityText)}
      </section>

      {fitTags.length ? (
        <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">适合的项目</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {fitTags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
          </div>
        </section>
      ) : null}

      <section id="products" className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">产品与案例</h2>
          <span className="text-sm text-ink/40">面料 {provider._count.fabrics} / 案例 {provider._count.showcaseItems}</span>
        </div>
        {provider.fabrics.length || provider.showcaseItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {provider.fabrics.map((fabric) => (
              <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="rounded-[8px] border border-black/8 bg-white p-3">
                <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
                <h3 className="mt-3 truncate font-semibold text-ink">{fabric.name}</h3>
                {[fabric.composition, fabric.weight, fabric.width].filter(Boolean).length ? (
                  <p className="mt-1 truncate text-sm text-ink/52">{[fabric.composition, fabric.weight, fabric.width].filter(Boolean).join(" / ")}</p>
                ) : null}
              </Link>
            ))}
            {provider.showcaseItems.map((item) => {
              const image = visibleImage(item.coverImageUrl);
              return (
                <Link key={item.id} href={`/providers/${provider.slug ?? provider.id}/showcase/${item.id}`} className="rounded-[8px] border border-black/8 bg-white p-3">
                  {image ? (
                    <img src={image} alt={item.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/35">案例</div>
                  )}
                  <p className="mt-3 text-xs font-semibold text-ink/35">{PROVIDER_SHOWCASE_TYPE_LABELS[item.type]}</p>
                  <h3 className="mt-1 truncate font-semibold text-ink">{item.title}</h3>
                  {item.summary || item.category ? <p className="mt-1 line-clamp-2 text-sm text-ink/52">{item.summary || item.category}</p> : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">该服务商正在补充公开产品与案例。</div>
        )}
      </section>

      <section id="inquiry" className="mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">联系与合作</h2>
          <p className="mt-3 text-sm leading-6 text-ink/58">优先使用站内结构化询盘，便于服务商判断需求、作品阶段和回复动作。</p>
          {contactVisible ? (
            <div className="mt-4 space-y-2 text-sm text-ink/60">
              {provider.contactEmail ? <p>邮箱：{provider.contactEmail}</p> : null}
              {provider.contactPhone ? <p>电话：{provider.contactPhone}</p> : null}
              {provider.wechat ? <p>微信：{provider.wechat}</p> : null}
              {provider.whatsapp ? <p>WhatsApp：{provider.whatsapp}</p> : null}
              {provider.website ? <p>网站：<a className="underline" href={provider.website}>{provider.website}</a></p> : null}
            </div>
          ) : (
            <p className="mt-4 rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/55">私人联系方式未公开。登录后可提交站内询盘，服务商会在供应商中心处理。</p>
          )}
        </div>
        <ProviderInquiryForm providerId={provider.id} workOptions={workOptions} loginHref={loginHref} isLoggedIn={Boolean(user)} />
      </section>
    </div>
  );
}
