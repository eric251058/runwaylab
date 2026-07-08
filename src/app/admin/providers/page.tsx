import { ProviderStatus, ProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveProvider } from "@/lib/provider-market-admin";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { fabrics: true, workProposals: true } } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商管理</h1>
      </header>

      <form action={saveProvider} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="name" required placeholder="服务商名称" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="type" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderType).map((type) => <option key={type} value={type}>{PROVIDER_TYPE_LABELS[type]}</option>)}</select>
        <select name="status" defaultValue={ProviderStatus.ACTIVE} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <input name="city" placeholder="城市" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="province" placeholder="省份" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="logoUrl" placeholder="Logo URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="coverUrl" placeholder="封面 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="contactName" placeholder="联系人" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="contactPhone" placeholder="电话" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="contactEmail" placeholder="邮箱" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="wechat" placeholder="微信" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="website" placeholder="官网" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="tags" placeholder="标签，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <textarea name="description" placeholder="服务商简介" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <label className="flex items-center gap-2 text-sm"><input name="isVerified" type="checkbox" />认证</label>
        <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" />推荐</label>
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增服务商</button>
      </form>

      <section className="mt-8 space-y-3">
        {providers.length ? providers.map((provider) => (
          <form key={provider.id} action={saveProvider} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={provider.id} />
            <input name="name" defaultValue={provider.name} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={provider.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="type" defaultValue={provider.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderType).map((type) => <option key={type} value={type}>{PROVIDER_TYPE_LABELS[type]}</option>)}</select>
            <select name="status" defaultValue={provider.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <input name="city" defaultValue={provider.city ?? ""} placeholder="城市" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="province" defaultValue={provider.province ?? ""} placeholder="省份" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="logoUrl" defaultValue={provider.logoUrl ?? ""} placeholder="Logo URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="coverUrl" defaultValue={provider.coverUrl ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="contactName" defaultValue={provider.contactName ?? ""} placeholder="联系人" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="contactPhone" defaultValue={provider.contactPhone ?? ""} placeholder="电话" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="contactEmail" defaultValue={provider.contactEmail ?? ""} placeholder="邮箱" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="wechat" defaultValue={provider.wechat ?? ""} placeholder="微信" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="website" defaultValue={provider.website ?? ""} placeholder="官网" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="tags" defaultValue={provider.tags.join(", ")} placeholder="标签" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input name="isVerified" type="checkbox" defaultChecked={provider.isVerified} />认证</label>
              <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={provider.isFeatured} />推荐</label>
            </div>
            <textarea name="description" defaultValue={provider.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">面料 {provider._count.fabrics} / 方案 {provider._count.workProposals}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务商。</div>}
      </section>
    </div>
  );
}
