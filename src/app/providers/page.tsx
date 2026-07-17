import Link from "next/link";
import type { Metadata } from "next";
import { FabricStatus, Prisma, ProviderApplicationStatus, ProviderType } from "@prisma/client";
import { SafeImage } from "@/components/media/SafeImage";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnyProviderForUser, getProviderApplicationForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_AVAILABILITY_LABELS,
  SUPPLY_PROVIDER_TYPES,
  SUPPLY_PROVIDER_TYPE_LABELS,
  getProviderTags,
  providerDisplayImage,
  providerPublicUrl,
  publicProviderWhere
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "服务商",
  description: "寻找 RunwayLab 认证面料供应商、打样工作室、生产工厂和专业服务商。"
};

type ProvidersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const pageSize = 9;

function valueOf(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function selectedType(value?: string) {
  return SUPPLY_PROVIDER_TYPES.includes(value as (typeof SUPPLY_PROVIDER_TYPES)[number]) ? (value as ProviderType) : null;
}

function queryHref(params: URLSearchParams, key: string, value?: string | null) {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.delete("page");
  const text = next.toString();
  return text ? `/providers?${text}` : "/providers";
}

function boolParam(value?: string) {
  return value === "true" || value === "1" || value === "on";
}

function compactMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ");
}

function providerPublicFacts(provider: {
  type: ProviderType;
  materials: string[];
  categories: string[];
  specialties: string[];
  techniques: string[];
  acceptsSampling: boolean;
  acceptsSmallBatch: boolean;
  acceptsLargeOrder: boolean;
  moqMin: number | null;
  minimumOrderQuantity: number | null;
  minimumOrder: string | null;
  leadTime: string | null;
  sampleSupported: boolean | null;
  singleSampleSupported: boolean | null;
  sampleLeadDays: number | null;
  productionLeadDays: number | null;
  monthlyCapacity: string | null;
  capacityText: string | null;
  priceRange: string | null;
}) {
  const moq = provider.moqMin ?? provider.minimumOrderQuantity;
  const category = provider.categories[0] ?? provider.specialties[0];
  const material = provider.materials[0];
  const technique = provider.techniques[0];
  const facts: Array<string | null> = [];

  if (provider.type === ProviderType.FABRIC_SUPPLIER) {
    facts.push(material ? `主营 ${material}` : null, provider.sampleSupported ?? provider.acceptsSampling ? "支持寄样" : null, provider.minimumOrder || (moq ? `MOQ ${moq}` : null));
  } else if (provider.type === ProviderType.SAMPLE_STUDIO) {
    facts.push(category ? `擅长 ${category}` : null, provider.singleSampleSupported ? "单件打样" : null, provider.leadTime || (provider.sampleLeadDays ? `打样 ${provider.sampleLeadDays} 天` : null), provider.priceRange);
  } else if (provider.type === ProviderType.FACTORY) {
    facts.push(category ? `擅长 ${category}` : null, provider.acceptsSmallBatch ? "可接小单" : null, provider.minimumOrder || (moq ? `MOQ ${moq}` : null), provider.monthlyCapacity, provider.leadTime || (provider.productionLeadDays ? `生产 ${provider.productionLeadDays} 天` : null));
  } else {
    facts.push(category ? `服务 ${category}` : null, technique ? `擅长 ${technique}` : null, provider.sampleLeadDays ? `周期 ${provider.sampleLeadDays} 天` : null);
  }

  return facts.filter(Boolean).slice(0, 3) as string[];
}

function providerCountText(provider: { type: ProviderType; _count: { fabrics: number; showcaseItems: number } }) {
  if (provider.type === ProviderType.FABRIC_SUPPLIER) {
    return provider._count.fabrics > 0 ? `产品 ${provider._count.fabrics}` : null;
  }
  if (provider.type === ProviderType.SAMPLE_STUDIO) {
    return provider._count.showcaseItems > 0 ? `打样案例 ${provider._count.showcaseItems}` : null;
  }
  if (provider.type === ProviderType.FACTORY) {
    return provider._count.showcaseItems > 0 ? `生产案例 ${provider._count.showcaseItems}` : null;
  }
  return provider._count.showcaseItems > 0 ? `服务案例 ${provider._count.showcaseItems}` : null;
}

export default async function ProvidersPage({ searchParams }: ProvidersPageProps) {
  const params = await searchParams;
  const current = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string" && value) current.set(key, value);
  }

  const q = valueOf(params, "q")?.trim();
  const city = valueOf(params, "city")?.trim();
  const category = valueOf(params, "category")?.trim();
  const type = selectedType(valueOf(params, "type"));
  const verified = boolParam(valueOf(params, "verified"));
  const acceptsSample = boolParam(valueOf(params, "acceptsSample"));
  const acceptsSmallBatch = boolParam(valueOf(params, "acceptsSmallBatch"));
  const acceptsBulk = boolParam(valueOf(params, "acceptsBulk"));
  const page = Math.max(1, Number.parseInt(valueOf(params, "page") ?? "1", 10) || 1);

  const where: Prisma.ProviderWhereInput = {
    ...publicProviderWhere(),
    ...(type ? { type } : {}),
    ...(verified ? { isVerified: true } : {}),
    ...(acceptsSample ? { acceptsSampling: true } : {}),
    ...(acceptsSmallBatch ? { acceptsSmallBatch: true } : {}),
    ...(acceptsBulk ? { acceptsLargeOrder: true } : {}),
    ...(city
      ? {
          OR: [
            { city: { contains: city, mode: "insensitive" } },
            { province: { contains: city, mode: "insensitive" } },
            { serviceRegions: { has: city } }
          ]
        }
      : {}),
    ...(category
      ? {
          AND: [
            {
              OR: [
                { categories: { has: category } },
                { specialties: { has: category } },
                { materials: { has: category } },
                { techniques: { has: category } },
                { supportedCategories: { contains: category, mode: "insensitive" } },
                { preferredMaterials: { contains: category, mode: "insensitive" } }
              ]
            }
          ]
        }
      : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { tagline: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { categories: { has: q } },
                { specialties: { has: q } },
                { materials: { has: q } },
                { techniques: { has: q } }
              ]
            }
          ]
        }
      : {})
  };

  const currentUser = await getCurrentUser();
  const [providers, total, currentProvider, currentApplication] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        fabrics: {
          where: { status: FabricStatus.ACTIVE },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 3
        },
        showcaseItems: {
          where: { status: "PUBLISHED" },
          orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
          take: 3
        },
        _count: { select: { fabrics: true, showcaseItems: true, inquiries: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { isVerified: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.provider.count({ where }),
    getAnyProviderForUser(currentUser),
    getProviderApplicationForUser(currentUser)
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">寻找适合你的服务商</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">浏览面料、打样和生产服务商，为作品寻找下一步合作伙伴。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentProvider ? (
            <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">服务商工作台</Link>
          ) : currentApplication?.status === ProviderApplicationStatus.PENDING ? (
            <span className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink/55">申请审核中</span>
          ) : currentApplication?.status === ProviderApplicationStatus.REJECTED ? (
            <Link href="/providers/apply" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">重新完善申请</Link>
          ) : (
            <Link href="/providers/apply" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">申请入驻</Link>
          )}
        </div>
      </header>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Link href={queryHref(current, "type", null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!type ? "bg-ink text-white" : "bg-paper text-ink/60"}`}>全部</Link>
          {SUPPLY_PROVIDER_TYPES.map((item) => (
            <Link key={item} href={queryHref(current, "type", item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${type === item ? "bg-ink text-white" : "bg-paper text-ink/60"}`}>
              {SUPPLY_PROVIDER_TYPE_LABELS[item]}
            </Link>
          ))}
        </div>
        <form className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <input name="q" defaultValue={q ?? ""} placeholder="搜索名称、品类、材料或工艺" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="city" defaultValue={city ?? ""} placeholder="城市" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="category" defaultValue={category ?? ""} placeholder="擅长品类" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
          <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">筛选</button>
          <div className="flex flex-wrap gap-4 text-sm text-ink/58 md:col-span-4">
            <label className="flex items-center gap-2"><input type="checkbox" name="acceptsSample" value="true" defaultChecked={acceptsSample} />接打样</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="acceptsSmallBatch" value="true" defaultChecked={acceptsSmallBatch} />接小单</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="acceptsBulk" value="true" defaultChecked={acceptsBulk} />接大货</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="verified" value="true" defaultChecked={verified} />已认证</label>
          </div>
        </form>
      </section>

      <div className="mb-4 flex items-center justify-between text-sm text-ink/45">
        <span>共 {total} 个服务商</span>
        <span>优先展示平台推荐与近期更新</span>
      </div>

      {providers.length ? (
        <section className="grid gap-5 lg:grid-cols-3">
          {providers.map((provider) => {
            const heroImage = providerDisplayImage(provider);
            const tags = getProviderTags(provider);
            const facts = providerPublicFacts(provider);
            const countText = providerCountText(provider);
            const thumbs = [
              ...provider.fabrics.map((fabric) => ({ id: fabric.id, image: fabric.imageUrl, label: fabric.name })),
              ...provider.showcaseItems.map((item) => ({ id: item.id, image: item.coverImageUrl, label: item.title }))
            ].slice(0, 3);
            return (
              <article key={provider.id} className="overflow-hidden rounded-[8px] border border-black/8 bg-white">
                <SafeImage
                  src={heroImage}
                  alt={provider.name}
                  className="aspect-[16/8] w-full object-cover"
                  placeholder={<span className="text-3xl font-semibold text-ink/35">{provider.name.slice(0, 1)}</span>}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-[6px] bg-paper text-sm font-semibold text-ink/55">{provider.name.slice(0, 1)}</div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-ink">{provider.name}</h2>
                      <p className="mt-1 truncate text-sm text-ink/52">{compactMeta([SUPPLY_PROVIDER_TYPE_LABELS[provider.type], provider.city, PROVIDER_AVAILABILITY_LABELS[provider.availabilityStatus]])}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-ink/58">{provider.tagline || provider.description || "可参与作品孵化，为设计作品提供材料、打样、生产或专业服务支持。"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.isVerified ? <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">已认证</span> : null}
                    {provider.type === ProviderType.FABRIC_SUPPLIER && (provider.sampleSupported ?? provider.acceptsSampling) ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">支持寄样</span> : null}
                    {provider.type === ProviderType.SAMPLE_STUDIO && provider.singleSampleSupported ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">单件打样</span> : null}
                    {provider.acceptsSmallBatch ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">接小单</span> : null}
                    {provider.acceptsLargeOrder ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">接大货</span> : null}
                    {tags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{tag}</span>)}
                  </div>
                  {facts.length ? (
                    <div className="mt-4 grid gap-2 text-xs text-ink/52 sm:grid-cols-3">
                      {facts.map((fact) => (
                        <span key={fact} className="rounded-[6px] bg-paper p-2">{fact}</span>
                      ))}
                    </div>
                  ) : null}
                  {thumbs.length ? (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {thumbs.map((thumb) => (
                        <SafeImage key={thumb.id} src={thumb.image} alt={thumb.label} className="aspect-square rounded-[6px] object-cover" placeholder="案例" />
                      ))}
                    </div>
                  ) : null}
                  {countText ? <p className="mt-3 text-xs text-ink/42">{countText}</p> : null}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link href={providerPublicUrl(provider)} className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">查看详情</Link>
                    <Link href={`${providerPublicUrl(provider)}#inquiry`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">联系服务商</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          暂无符合条件的服务商。可以减少筛选条件，或稍后查看平台新增服务商。
        </div>
      )}

      {pageCount > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2">
          {page > 1 ? <Link href={queryHref(current, "page", String(page - 1))} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">上一页</Link> : null}
          <span className="px-3 text-sm text-ink/45">{page} / {pageCount}</span>
          {page < pageCount ? <Link href={queryHref(current, "page", String(page + 1))} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">下一页</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
