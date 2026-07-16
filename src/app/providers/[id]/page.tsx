import Link from "next/link";
import { notFound } from "next/navigation";
import { FabricStatus, ProviderShowcaseStatus, ProviderType } from "@prisma/client";
import { SafeImage } from "@/components/media/SafeImage";
import { ProviderInquiryForm } from "@/components/providers/ProviderInquiryForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { providerInquiryTypeForProvider } from "@/lib/provider-onboarding";
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
  publicProviderWhere
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
  const isFabricProvider = provider.type === ProviderType.FABRIC_SUPPLIER;
  const isSampleStudio = provider.type === ProviderType.SAMPLE_STUDIO;
  const isFactory = provider.type === ProviderType.FACTORY;
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
  const inquiryTitle = isFactory ? "发起生产合作" : isSampleStudio ? "发起打样合作" : isFabricProvider ? "发起面料合作" : "发起合作询盘";
  const inquiryDescription = isFactory
    ? "说明可承接数量、预计周期和作品阶段，本阶段不会生成订单。"
    : isSampleStudio
      ? "说明需要制版、样衣或修改的内容，本阶段不会生成订单。"
      : "说明你需要的面料方向、样布或合作需求，本阶段不会交换私人联系方式。";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="grid gap-6 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[0.9fr_1.1fr] md:p-6">
        <SafeImage
          src={heroImage}
          alt={provider.name}
          className="aspect-[16/10] w-full rounded-[8px] object-cover"
          placeholder={<span className="text-5xl font-semibold text-ink/30">{provider.name.slice(0, 1)}</span>}
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">{provider.name}</h1>
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
            {isOwner ? <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">管理主页</Link> : null}
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {infoItem(isFabricProvider ? "主营面料" : isSampleStudio ? "擅长品类" : "主营品类", listText(provider.materials.length && isFabricProvider ? provider.materials : provider.categories.length ? provider.categories : provider.specialties, ""))}
        {infoItem("服务范围", provider.serviceArea || listText(provider.serviceRegions, ""))}
        {isFabricProvider ? infoItem("样布支持", provider.sampleSupported ?? provider.acceptsSampling ? "支持寄样" : null) : null}
        {isSampleStudio ? infoItem("制版支持", provider.patternMaking) : null}
        {isSampleStudio ? infoItem("单件打样", provider.singleSampleSupported ? "支持" : null) : null}
        {isFactory ? infoItem("小单承接", provider.acceptsSmallBatch ? "可承接" : null) : null}
        {isFactory ? infoItem("起订量", provider.minimumOrder || provider.moqMin || provider.minimumOrderQuantity) : null}
        {isFactory ? infoItem("月产能", provider.monthlyCapacity) : null}
        {infoItem(isFactory ? "生产周期" : isSampleStudio ? "打样周期" : "常规交期", provider.leadTime || (provider.productionLeadDays ? `${provider.productionLeadDays} 天` : provider.sampleLeadDays ? `${provider.sampleLeadDays} 天` : null))}
        {infoItem("响应时间", provider.responseTime)}
        {infoItem("质量控制", provider.qualityControl)}
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
          <h2 className="text-2xl font-semibold text-ink">{isFabricProvider ? "面料产品" : isFactory ? "生产案例" : "打样案例"}</h2>
          {(isFabricProvider ? provider._count.fabrics : provider._count.showcaseItems) > 0 ? (
            <span className="text-sm text-ink/40">
              {isFabricProvider ? `产品 ${provider._count.fabrics}` : isFactory ? `生产案例 ${provider._count.showcaseItems}` : `打样案例 ${provider._count.showcaseItems}`}
            </span>
          ) : null}
        </div>
        {isFabricProvider && provider.fabrics.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {provider.fabrics.map((fabric) => (
              <Link key={fabric.id} href={`/fabrics/${fabric.slug ?? fabric.id}`} className="rounded-[8px] border border-black/8 bg-white p-3">
                <SafeImage src={fabric.imageUrl ?? fabric.imageUrls[0] ?? null} alt={fabric.name} className="aspect-[4/3] w-full rounded-[6px] object-cover" />
                <h3 className="mt-3 truncate font-semibold text-ink">{fabric.name}</h3>
                {[fabric.composition, fabric.weight, fabric.width].filter(Boolean).length ? (
                  <p className="mt-1 truncate text-sm text-ink/52">{[fabric.composition, fabric.weight, fabric.width].filter(Boolean).join(" / ")}</p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : !isFabricProvider && provider.showcaseItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {provider.showcaseItems.map((item) => {
              return (
                <Link key={item.id} href={`/providers/${provider.slug ?? provider.id}/showcase/${item.id}`} className="rounded-[8px] border border-black/8 bg-white p-3">
                  <SafeImage src={item.coverImageUrl} alt={item.title} className="aspect-[4/3] w-full rounded-[6px] object-cover" placeholder="案例图片" />
                  <p className="mt-3 text-xs font-semibold text-ink/35">{PROVIDER_SHOWCASE_TYPE_LABELS[item.type]}</p>
                  <h3 className="mt-1 truncate font-semibold text-ink">{item.title}</h3>
                  {item.summary || item.category ? <p className="mt-1 line-clamp-2 text-sm text-ink/52">{item.summary || item.category}</p> : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
            {isFabricProvider ? "该面料供应商正在补充公开面料产品。" : "该服务商正在补充公开案例。"}
          </div>
        )}
      </section>

      <section id="inquiry" className="mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">{isFactory ? "发起生产合作" : isSampleStudio ? "发起打样合作" : "联系与合作"}</h2>
          <p className="mt-3 text-sm leading-6 text-ink/58">提交合作需求后，服务商会根据作品和需求判断是否适合继续沟通。</p>
          {contactVisible ? (
            <div className="mt-4 space-y-2 text-sm text-ink/60">
              {provider.contactEmail ? <p>邮箱：{provider.contactEmail}</p> : null}
              {provider.contactPhone ? <p>电话：{provider.contactPhone}</p> : null}
              {provider.wechat ? <p>微信：{provider.wechat}</p> : null}
              {provider.whatsapp ? <p>WhatsApp：{provider.whatsapp}</p> : null}
              {provider.website ? <p>网站：<a className="underline" href={provider.website}>{provider.website}</a></p> : null}
            </div>
          ) : (
            <p className="mt-4 rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/55">私人联系方式未公开。登录后可提交站内询盘，服务商会在工作台处理。</p>
          )}
        </div>
        <ProviderInquiryForm
          providerId={provider.id}
          workOptions={workOptions}
          loginHref={loginHref}
          isLoggedIn={Boolean(user)}
          defaultRequestType={providerInquiryTypeForProvider(provider.type)}
          title={inquiryTitle}
          description={inquiryDescription}
        />
      </section>
    </div>
  );
}
