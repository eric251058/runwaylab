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
  isAdminUser,
  isProviderOwner,
  listText,
  providerDisplayImage,
  providerPublicUrl,
  publicProviderWhere
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

type ProviderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProviderDetailPage({ params, searchParams }: ProviderDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
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

  const isAdmin = isAdminUser(user);
  const isOwner = isProviderOwner(provider, user);
  const isVisitorPreview = isOwner && searchValue(query, "preview") === "visitor";
  const showOwnerControls = isOwner && !isVisitorPreview;
  const contactEnabled = provider.publicContactEnabled;
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
  const inquiryTitle = "联系服务商";
  const inquiryDescription = "通过站内询盘说明作品、面料或合作需求。联系方式默认不会公开，双方确认后再交换。";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      {isVisitorPreview ? (
        <div className="mb-5 flex flex-col gap-3 rounded-[8px] border border-black/8 bg-white p-4 text-sm text-ink/65 md:flex-row md:items-center md:justify-between">
          <span className="font-semibold text-ink">正在预览访客视角</span>
          <Link href={publicUrl} className="text-sm font-semibold text-ink/60 underline underline-offset-4 hover:text-ink">退出预览</Link>
        </div>
      ) : null}
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
            {showOwnerControls ? (
              <>
                <Link href="/provider-center/profile" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">编辑服务商主页</Link>
                <Link href="/provider-center/fabrics" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">管理面料产品</Link>
                <Link href="/provider-center/showcase" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">管理案例</Link>
                <Link href="/provider-center/inquiries" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">查看收到的询盘</Link>
                <Link href="/provider-center/recommendations" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">查看发出的推荐</Link>
                <Link href={`${publicUrl}?preview=visitor`} className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-ink/60 hover:bg-paper hover:text-ink">预览访客视角</Link>
              </>
            ) : (
              <>
                {contactEnabled ? <a href="#inquiry" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">发送站内询盘</a> : null}
                <a href="#products" className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold ${contactEnabled ? "border border-black/10 text-ink" : "bg-ink text-white"}`}>查看产品与案例</a>
                {isAdmin ? <Link href="/admin/providers" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">后台管理此服务商</Link> : null}
              </>
            )}
          </div>
        </div>
      </header>

      {showOwnerControls ? (
        <section className="mt-6 rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">服务商主页管理</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">这是你的公开主页。访客不会看到管理入口，也不能在这里获得你的完整联系方式。</p>
        </section>
      ) : null}

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

      {!showOwnerControls ? (
        <section id="inquiry" className="mt-10">
          {contactEnabled ? (
            <ProviderInquiryForm
              providerId={provider.id}
              workOptions={workOptions}
              loginHref={loginHref}
              isLoggedIn={Boolean(user)}
              defaultRequestType={providerInquiryTypeForProvider(provider.type)}
              title={inquiryTitle}
              description={inquiryDescription}
              disabledReason={isVisitorPreview ? "预览模式下不能向自己发送询盘。" : undefined}
            />
          ) : (
            <div className="rounded-[8px] border border-black/8 bg-white p-5">
              <h2 className="text-2xl font-semibold text-ink">联系服务商</h2>
              <p className="mt-3 text-sm leading-6 text-ink/58">该服务商暂未开启站内联系。你仍可以先查看公开产品与案例。</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
