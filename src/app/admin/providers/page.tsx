import Link from "next/link";
import {
  ProviderAvailabilityStatus,
  ProviderCapacityStatus,
  ProviderOrderPreference,
  ProviderShowcaseStatus,
  ProviderStatus,
  ProviderType,
  RequestStatus
} from "@prisma/client";
import { reviewProviderShowcaseItem, updateProviderInquiry } from "@/lib/provider-center-actions";
import { PROVIDER_CAPACITY_STATUS_LABELS, PROVIDER_ORDER_PREFERENCE_LABELS } from "@/lib/order-maturity";
import { saveProvider } from "@/lib/provider-market-admin";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_AVAILABILITY_LABELS,
  PROVIDER_INQUIRY_STATUS_LABELS,
  PROVIDER_INQUIRY_TYPE_LABELS,
  PROVIDER_SHOWCASE_STATUS_LABELS,
  PROVIDER_SHOWCASE_TYPE_LABELS,
  SUPPLY_PROVIDER_TYPE_LABELS,
  providerCompleteness,
  providerPublicUrl
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

type AdminProvidersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const tabs = [
  ["providers", "服务商"],
  ["showcase", "展示内容审核"],
  ["inquiries", "合作询盘"]
] as const;

function input(name: string, placeholder: string, value = "") {
  return <input name={name} defaultValue={value} placeholder={placeholder} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />;
}

function checkbox(name: string, label: string, checked = false) {
  return <label className="flex items-center gap-2 text-sm"><input name={name} type="checkbox" defaultChecked={checked} />{label}</label>;
}

export default async function AdminProvidersPage({ searchParams }: AdminProvidersPageProps) {
  const params = await searchParams;
  const tabValue = Array.isArray(params?.tab) ? params?.tab[0] : params?.tab;
  const activeTab = tabs.some(([value]) => value === tabValue) ? tabValue : "providers";

  const [providers, showcaseItems, inquiries] = await Promise.all([
    prisma.provider.findMany({
      include: {
        fabrics: true,
        showcaseItems: true,
        inquiries: true,
        owner: { select: { id: true, email: true, nickname: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.providerShowcaseItem.findMany({
      include: { provider: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 80
    }),
    prisma.cooperationRequest.findMany({
      where: { providerId: { not: null } },
      include: {
        provider: true,
        user: { select: { nickname: true, email: true } },
        work: { select: { id: true, title: true } }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商管理</h1>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([value, label]) => (
          <Link key={value} href={`/admin/providers?tab=${value}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeTab === value ? "bg-ink text-white" : "bg-white text-ink/60"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {activeTab === "providers" ? (
        <>
          <form action={saveProvider} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-4">
            {input("name", "服务商名称")}
            {input("slug", "slug，可选")}
            <select name="type" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderType).map((type) => <option key={type} value={type}>{SUPPLY_PROVIDER_TYPE_LABELS[type]}</option>)}</select>
            <select name="status" defaultValue={ProviderStatus.ACTIVE} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            {input("tagline", "一句定位")}
            {input("city", "城市")}
            {input("logoUrl", "Logo URL")}
            {input("coverUrl", "封面 URL")}
            {input("categories", "擅长品类")}
            {input("materials", "材料")}
            {input("techniques", "工艺")}
            {input("serviceRegions", "服务地区")}
            {input("tags", "旧标签/关键词")}
            {input("moqMin", "MOQ")}
            {input("minimumOrderQuantity", "旧最低起订量")}
            {input("maximumOrderQuantity", "最高承接量")}
            {input("sampleLeadDays", "打样周期/天")}
            {input("productionLeadDays", "生产周期/天")}
            <select name="availabilityStatus" defaultValue={ProviderAvailabilityStatus.OPEN} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderAvailabilityStatus).map((status) => <option key={status} value={status}>{PROVIDER_AVAILABILITY_LABELS[status]}</option>)}</select>
            {input("contactEmail", "联系邮箱")}
            {input("contactPhone", "电话")}
            {input("wechat", "微信")}
            {input("whatsapp", "WhatsApp")}
            <textarea name="description" placeholder="服务商简介" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-4" />
            <div className="flex flex-wrap gap-4 md:col-span-4">
              {checkbox("isVerified", "认证")}
              {checkbox("isFeatured", "精选")}
              {checkbox("acceptsSampling", "接打样", true)}
              {checkbox("acceptsSmallBatch", "接小单")}
              {checkbox("acceptsLargeOrder", "接大货")}
              {checkbox("opportunityVisible", "公开展示", true)}
              {checkbox("publicContactEnabled", "允许登录用户发起站内联系")}
              <p className="basis-full text-xs leading-5 text-ink/45">公开页面不会直接展示完整手机号、邮箱、微信或 WhatsApp；完整联系方式仅在后台和授权询盘上下文查看。</p>
            </div>
            <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-4">新增服务商</button>
          </form>

          <section className="mt-8 space-y-4">
            {providers.map((provider) => {
              const completeness = providerCompleteness(provider);
              const newInquiryCount = provider.inquiries.filter((inquiry) => inquiry.status === RequestStatus.PENDING).length;
              return (
                <form key={provider.id} action={saveProvider} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
                  <input type="hidden" name="id" value={provider.id} />
                  {input("name", "服务商名称", provider.name)}
                  {input("slug", "slug", provider.slug ?? "")}
                  <select name="type" defaultValue={provider.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderType).map((type) => <option key={type} value={type}>{SUPPLY_PROVIDER_TYPE_LABELS[type]}</option>)}</select>
                  <select name="status" defaultValue={provider.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
                  {input("tagline", "一句定位", provider.tagline ?? "")}
                  {input("city", "城市", provider.city ?? "")}
                  {input("logoUrl", "Logo URL", provider.logoUrl ?? "")}
                  {input("coverUrl", "封面 URL", provider.coverUrl ?? "")}
                  {input("categories", "擅长品类", provider.categories.join(", "))}
                  {input("materials", "材料", provider.materials.join(", "))}
                  {input("techniques", "工艺", provider.techniques.join(", "))}
                  {input("serviceRegions", "服务地区", provider.serviceRegions.join(", "))}
                  {input("tags", "旧标签/关键词", provider.tags.join(", "))}
                  {input("moqMin", "MOQ", provider.moqMin?.toString() ?? "")}
                  {input("minimumOrderQuantity", "旧最低起订量", provider.minimumOrderQuantity?.toString() ?? "")}
                  {input("maximumOrderQuantity", "最高承接量", provider.maximumOrderQuantity?.toString() ?? "")}
                  {input("sampleLeadDays", "打样周期/天", provider.sampleLeadDays?.toString() ?? "")}
                  {input("productionLeadDays", "生产周期/天", provider.productionLeadDays?.toString() ?? "")}
                  <select name="availabilityStatus" defaultValue={provider.availabilityStatus} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderAvailabilityStatus).map((status) => <option key={status} value={status}>{PROVIDER_AVAILABILITY_LABELS[status]}</option>)}</select>
                  <select name="orderPreference" defaultValue={provider.orderPreference} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderOrderPreference).map((value) => <option key={value} value={value}>{PROVIDER_ORDER_PREFERENCE_LABELS[value]}</option>)}</select>
                  <select name="capacityStatus" defaultValue={provider.capacityStatus} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderCapacityStatus).map((value) => <option key={value} value={value}>{PROVIDER_CAPACITY_STATUS_LABELS[value]}</option>)}</select>
                  {input("contactEmail", "联系邮箱", provider.contactEmail ?? "")}
                  {input("contactPhone", "电话", provider.contactPhone ?? "")}
                  {input("wechat", "微信", provider.wechat ?? "")}
                  {input("whatsapp", "WhatsApp", provider.whatsapp ?? "")}
                  <textarea name="description" defaultValue={provider.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-4" />
                  <div className="flex flex-wrap gap-4 md:col-span-4">
                    {checkbox("isVerified", "认证", provider.isVerified)}
                    {checkbox("isFeatured", "精选", provider.isFeatured)}
                    {checkbox("acceptsSampling", "接打样", provider.acceptsSampling)}
                    {checkbox("acceptsSmallBatch", "接小单", provider.acceptsSmallBatch)}
                    {checkbox("acceptsLargeOrder", "接大货", provider.acceptsLargeOrder)}
                    {checkbox("opportunityVisible", "公开展示", provider.opportunityVisible)}
                    {checkbox("publicContactEnabled", "允许登录用户发起站内联系", provider.publicContactEnabled)}
                    <p className="basis-full text-xs leading-5 text-ink/45">公开页面不会直接展示完整手机号、邮箱、微信或 WhatsApp；完整联系方式仅在后台和授权询盘上下文查看。</p>
                  </div>
                  <div className="text-xs leading-5 text-ink/45 md:col-span-3">
                    完整度 {completeness.percent}% / 面料 {provider.fabrics.length} / 案例 {provider.showcaseItems.length} / 新询盘 {newInquiryCount} / 归属 {provider.owner?.email ?? provider.contactEmail ?? "未关联"}
                  </div>
                  <div className="flex gap-2">
                    <Link href={providerPublicUrl(provider)} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">公开页</Link>
                    <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">保存</button>
                  </div>
                </form>
              );
            })}
          </section>
        </>
      ) : null}

      {activeTab === "showcase" ? (
        <section className="space-y-4">
          {showcaseItems.length ? showcaseItems.map((item) => (
            <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{item.provider.name}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_SHOWCASE_TYPE_LABELS[item.type]}</span>
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_SHOWCASE_STATUS_LABELS[item.status]}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/58">{item.summary || item.description || "无摘要"}</p>
                  {item.reviewNote ? <p className="mt-2 text-xs text-ink/45">备注：{item.reviewNote}</p> : null}
                </div>
                <div className="grid gap-2 lg:w-80">
                  {[ProviderShowcaseStatus.PUBLISHED, ProviderShowcaseStatus.PENDING_REVIEW, ProviderShowcaseStatus.REJECTED, ProviderShowcaseStatus.ARCHIVED].map((status) => (
                    <form key={status} action={reviewProviderShowcaseItem} className="grid gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="status" value={status} />
                      <input name="reviewNote" placeholder="审核备注" className="h-9 rounded-[6px] border border-black/10 px-3 text-xs" />
                      {status === ProviderShowcaseStatus.PUBLISHED ? <label className="flex items-center gap-2 text-xs"><input name="isFeatured" type="checkbox" defaultChecked={item.isFeatured} />精选</label> : null}
                      <button className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">{PROVIDER_SHOWCASE_STATUS_LABELS[status]}</button>
                    </form>
                  ))}
                </div>
              </div>
            </article>
          )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无待审核展示内容。</div>}
        </section>
      ) : null}

      {activeTab === "inquiries" ? (
        <section className="space-y-4">
          {inquiries.length ? inquiries.map((inquiry) => (
            <article key={inquiry.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_INQUIRY_STATUS_LABELS[inquiry.status]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{inquiry.provider?.name}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_INQUIRY_TYPE_LABELS[inquiry.requestType]}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{inquiry.user.nickname} / {inquiry.contactPreference || inquiry.contact}</h2>
                  {inquiry.work ? <p className="mt-1 text-sm text-ink/52">关联作品：<Link href={`/works/${inquiry.work.id}`} className="underline">{inquiry.work.title}</Link></p> : null}
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/58">{inquiry.message || "无说明"}</p>
                </div>
                <form action={updateProviderInquiry} className="grid gap-2 lg:w-80">
                  <input type="hidden" name="id" value={inquiry.id} />
                  <textarea name="providerResponse" defaultValue={inquiry.providerResponse ?? ""} placeholder="运营备注 / 服务商处理说明" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <button name="status" value={RequestStatus.CONTACTED} className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">已读</button>
                    <button name="status" value={RequestStatus.QUOTED} className="h-9 rounded-full bg-ink px-3 text-xs font-semibold text-white">已回复</button>
                    <button name="status" value={RequestStatus.CLOSED} className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">关闭</button>
                    <button name="status" value={RequestStatus.COMPLETED} className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">完成</button>
                  </div>
                </form>
              </div>
            </article>
          )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务商询盘。</div>}
        </section>
      ) : null}
    </div>
  );
}
