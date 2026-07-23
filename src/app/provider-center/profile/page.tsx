import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderAvailabilityStatus, ProviderStatus } from "@prisma/client";
import { saveProviderCenterProfile } from "@/lib/provider-center-actions";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { PROVIDER_AVAILABILITY_LABELS, SUPPLY_PROVIDER_TYPE_LABELS, providerCompleteness } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

export default async function ProviderCenterProfilePage() {
  const { provider } = await getProviderCenterContext("/provider-center/profile");
  if (!provider) redirect("/providers/apply");

  const suspended = provider.status === ProviderStatus.SUSPENDED;
  const completeness = providerCompleteness(provider);
  const steps = ["品牌形象", "专业能力", "接单能力", "联系方式"];
  const missing = completeness.missing.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PROVIDER PROFILE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">完善服务商主页</h1>
          <p className="mt-3 text-sm text-ink/52">{provider.name} / {SUPPLY_PROVIDER_TYPE_LABELS[provider.type]}</p>
        </div>
        <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">返回中心</Link>
      </header>

      {suspended ? <div className="mb-5 rounded-[8px] border border-black/8 bg-white p-4 text-sm text-ink/58">账号已暂停，暂不能保存新公开内容。</div> : null}

      <section className="mb-5 rounded-[8px] border border-black/8 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">当前主页完整度 {completeness.percent}%</p>
            <p className="mt-1 text-sm leading-6 text-ink/52">{missing.length ? `建议先补充：${missing.join("、")}` : "基础主页已经比较完整，可以继续上传面料或案例。"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-ink/55 sm:grid-cols-4">
            {steps.map((step, index) => (
              <span key={step} className="rounded-full bg-paper px-3 py-2 text-center">{index + 1}. {step}</span>
            ))}
          </div>
        </div>
      </section>

      <form action={saveProviderCenterProfile} className="space-y-4">
        <section className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">STEP 1</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">品牌形象</h2>
            <p className="mt-1 text-sm text-ink/52">先让访客知道你是谁、在哪、能提供什么。</p>
          </div>
          <input name="name" required defaultValue={provider.name} placeholder="服务商名称" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="city" defaultValue={provider.city ?? ""} placeholder="城市" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="address" defaultValue={provider.address ?? ""} placeholder="详细地址，可选" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="province" defaultValue={provider.province ?? ""} placeholder="省份" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="tagline" defaultValue={provider.tagline ?? ""} placeholder="一句定位，最多 180 字" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="logoUrl" defaultValue={provider.logoUrl ?? ""} placeholder="Logo 图片 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="coverUrl" defaultValue={provider.coverUrl ?? ""} placeholder="封面图片 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <textarea name="description" defaultValue={provider.description ?? ""} placeholder="公司/工作室介绍、服务范围、适合项目。" className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" disabled={suspended} />
          <button disabled={suspended} className="h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink disabled:opacity-50 md:col-span-2">保存这一部分</button>
        </section>

        <section className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">STEP 2</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">专业能力</h2>
            <p className="mt-1 text-sm text-ink/52">用短标签说明品类、材料、工艺和服务地区。</p>
          </div>
          <input name="specialties" defaultValue={provider.specialties.join(", ")} placeholder="能力标签，如：女装, 梭织, 快速打样" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" disabled={suspended} />
          <input name="tags" defaultValue={provider.tags.join(", ")} placeholder="主页关键词，逗号分隔" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" disabled={suspended} />
          <input name="categories" defaultValue={provider.categories.join(", ")} placeholder="擅长品类，如：连衣裙, 外套, 童装" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="materials" defaultValue={provider.materials.join(", ")} placeholder="擅长材料" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="techniques" defaultValue={provider.techniques.join(", ")} placeholder="擅长工艺" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="serviceRegions" defaultValue={provider.serviceRegions.join(", ")} placeholder="服务地区" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="serviceArea" defaultValue={provider.serviceArea ?? ""} placeholder="服务范围，如 全国、华东、浙江" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="responseTime" defaultValue={provider.responseTime ?? ""} placeholder="响应时间，如 1 个工作日内" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <button disabled={suspended} className="h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink disabled:opacity-50 md:col-span-2">保存这一部分</button>
        </section>

        <section className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">STEP 3</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">接单能力</h2>
            <p className="mt-1 text-sm text-ink/52">只填你有把握公开的 MOQ、周期和承接范围。</p>
          </div>
          <select name="availabilityStatus" defaultValue={provider.availabilityStatus} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended}>
            {Object.values(ProviderAvailabilityStatus).map((status) => (
              <option key={status} value={status}>{PROVIDER_AVAILABILITY_LABELS[status]}</option>
            ))}
          </select>
          <input name="moqMin" defaultValue={provider.moqMin ?? ""} placeholder="最低起订量" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="maximumOrderQuantity" defaultValue={provider.maximumOrderQuantity ?? ""} placeholder="最高承接量" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="sampleLeadDays" defaultValue={provider.sampleLeadDays ?? ""} placeholder="打样周期 / 天" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="productionLeadDays" defaultValue={provider.productionLeadDays ?? ""} placeholder="生产周期 / 天" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="minimumOrder" defaultValue={provider.minimumOrder ?? ""} placeholder="起订量说明，如 100 件起" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="leadTime" defaultValue={provider.leadTime ?? ""} placeholder="周期说明，如 15-25 天" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="priceRange" defaultValue={provider.priceRange ?? ""} placeholder="参考价格区间，可选" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="monthlyCapacity" defaultValue={provider.monthlyCapacity ?? ""} placeholder="月产能，如 5000 件" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <select name="patternMaking" defaultValue={provider.patternMaking ?? "需确认"} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended}>
            <option value="是">提供制版</option>
            <option value="否">不提供制版</option>
            <option value="需确认">制版需确认</option>
          </select>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input name="acceptsSampling" type="checkbox" defaultChecked={provider.acceptsSampling} disabled={suspended} />接打样</label>
            <label className="flex items-center gap-2"><input name="sampleSupported" type="checkbox" defaultChecked={Boolean(provider.sampleSupported ?? provider.acceptsSampling)} disabled={suspended} />支持寄样/打样</label>
            <label className="flex items-center gap-2"><input name="singleSampleSupported" type="checkbox" defaultChecked={Boolean(provider.singleSampleSupported)} disabled={suspended} />单件打样</label>
            <label className="flex items-center gap-2"><input name="acceptsSmallBatch" type="checkbox" defaultChecked={provider.acceptsSmallBatch} disabled={suspended} />接小单</label>
            <label className="flex items-center gap-2"><input name="acceptsLargeOrder" type="checkbox" defaultChecked={provider.acceptsLargeOrder} disabled={suspended} />接大货</label>
          </div>
          <textarea name="capacityText" defaultValue={provider.capacityText ?? ""} placeholder="产能说明，例如：适合 50-300 件小单，旺季周期需提前沟通。" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" disabled={suspended} />
          <textarea name="qualityControl" defaultValue={provider.qualityControl ?? ""} placeholder="质量控制说明，最多 500 字" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" disabled={suspended} />
          <button disabled={suspended} className="h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink disabled:opacity-50 md:col-span-2">保存这一部分</button>
        </section>

        <section className="grid gap-4 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">STEP 4</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">联系方式</h2>
            <p className="mt-1 text-sm leading-6 text-ink/52">公开页面不会直接展示完整手机号、邮箱、微信或 WhatsApp。双方可先通过站内询盘沟通，并在明确授权后交换联系方式。</p>
          </div>
          <input name="contactName" defaultValue={provider.contactName ?? ""} placeholder="联系人" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="contactPhone" defaultValue={provider.contactPhone ?? ""} placeholder="电话" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="contactEmail" defaultValue={provider.contactEmail ?? ""} placeholder="邮箱" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="wechat" defaultValue={provider.wechat ?? ""} placeholder="微信" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="whatsapp" defaultValue={provider.whatsapp ?? ""} placeholder="WhatsApp" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <input name="website" defaultValue={provider.website ?? ""} placeholder="网站" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" disabled={suspended} />
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="publicContactEnabled" type="checkbox" defaultChecked={provider.publicContactEnabled} disabled={suspended} />允许登录用户发起站内联系</label>
          <button disabled={suspended} className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">保存主页资料</button>
        </section>
      </form>
    </div>
  );
}
