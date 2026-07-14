import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderAvailabilityStatus, ProviderStatus } from "@prisma/client";
import { saveProviderCenterProfile } from "@/lib/provider-center-actions";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { PROVIDER_AVAILABILITY_LABELS, SUPPLY_PROVIDER_TYPE_LABELS } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export default async function ProviderCenterProfilePage() {
  const { provider } = await getProviderCenterContext("/provider-center/profile");
  if (!provider) redirect("/providers/apply");

  const suspended = provider.status === ProviderStatus.SUSPENDED;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PROVIDER PROFILE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">完善供应商主页</h1>
          <p className="mt-3 text-sm text-ink/52">{provider.name} / {SUPPLY_PROVIDER_TYPE_LABELS[provider.type]}</p>
        </div>
        <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
      </header>

      {suspended ? <div className="mb-5 rounded-[8px] border border-black/8 bg-white p-4 text-sm text-ink/58">账号已暂停，暂不能保存新公开内容。</div> : null}

      <form action={saveProviderCenterProfile} className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
        <input name="name" required defaultValue={provider.name} placeholder="服务商名称" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <select name="availabilityStatus" defaultValue={provider.availabilityStatus} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended}>
          {Object.values(ProviderAvailabilityStatus).map((status) => (
            <option key={status} value={status}>{PROVIDER_AVAILABILITY_LABELS[status]}</option>
          ))}
        </select>
        <input name="tagline" defaultValue={provider.tagline ?? ""} placeholder="一句定位，最多 180 字" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" disabled={suspended} />
        <input name="city" defaultValue={provider.city ?? ""} placeholder="城市" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="province" defaultValue={provider.province ?? ""} placeholder="省份" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="logoUrl" defaultValue={provider.logoUrl ?? ""} placeholder="Logo 图片 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="coverUrl" defaultValue={provider.coverUrl ?? ""} placeholder="封面图片 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <textarea name="description" defaultValue={provider.description ?? ""} placeholder="公司/工作室介绍、服务范围、适合项目。" className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" disabled={suspended} />

        <input name="specialties" defaultValue={provider.specialties.join(", ")} placeholder="能力标签，如：女装, 梭织, 快速打样" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" disabled={suspended} />
        <input name="tags" defaultValue={provider.tags.join(", ")} placeholder="主页关键词，逗号分隔" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" disabled={suspended} />
        <input name="categories" defaultValue={provider.categories.join(", ")} placeholder="擅长品类，如：连衣裙, 外套, 童装" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="materials" defaultValue={provider.materials.join(", ")} placeholder="擅长材料" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="techniques" defaultValue={provider.techniques.join(", ")} placeholder="擅长工艺" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="serviceRegions" defaultValue={provider.serviceRegions.join(", ")} placeholder="服务地区" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />

        <input name="moqMin" defaultValue={provider.moqMin ?? ""} placeholder="最低起订量" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="maximumOrderQuantity" defaultValue={provider.maximumOrderQuantity ?? ""} placeholder="最高承接量" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="sampleLeadDays" defaultValue={provider.sampleLeadDays ?? ""} placeholder="打样周期 / 天" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="productionLeadDays" defaultValue={provider.productionLeadDays ?? ""} placeholder="生产周期 / 天" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <textarea name="capacityText" defaultValue={provider.capacityText ?? ""} placeholder="产能说明，例如：适合 50-300 件小单，旺季周期需提前沟通。" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" disabled={suspended} />

        <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
          <label className="flex items-center gap-2"><input name="acceptsSampling" type="checkbox" defaultChecked={provider.acceptsSampling} disabled={suspended} />接打样</label>
          <label className="flex items-center gap-2"><input name="acceptsSmallBatch" type="checkbox" defaultChecked={provider.acceptsSmallBatch} disabled={suspended} />接小单</label>
          <label className="flex items-center gap-2"><input name="acceptsLargeOrder" type="checkbox" defaultChecked={provider.acceptsLargeOrder} disabled={suspended} />接大货</label>
          <label className="flex items-center gap-2"><input name="publicContactEnabled" type="checkbox" defaultChecked={provider.publicContactEnabled} disabled={suspended} />登录用户可见联系方式</label>
        </div>

        <input name="contactName" defaultValue={provider.contactName ?? ""} placeholder="联系人" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="contactPhone" defaultValue={provider.contactPhone ?? ""} placeholder="电话" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="contactEmail" defaultValue={provider.contactEmail ?? ""} placeholder="邮箱" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="wechat" defaultValue={provider.wechat ?? ""} placeholder="微信" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="whatsapp" defaultValue={provider.whatsapp ?? ""} placeholder="WhatsApp" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
        <input name="website" defaultValue={provider.website ?? ""} placeholder="网站" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />

        <button disabled={suspended} className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">保存主页资料</button>
      </form>
    </div>
  );
}
