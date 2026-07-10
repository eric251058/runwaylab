import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderCapacityStatus, ProviderOrderPreference } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { PROVIDER_CAPACITY_STATUS_LABELS, PROVIDER_ORDER_PREFERENCE_LABELS } from "@/lib/order-maturity";
import { saveProviderCapability } from "@/lib/order-maturity-actions";
import { getProviderForUser } from "@/lib/provider-access";

export const dynamic = "force-dynamic";

export default async function MeProviderProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/me/provider-profile");
  }

  const provider = await getProviderForUser(user);

  if (!provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-[8px] border border-black/8 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Profile</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">服务商身份待平台关联</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">当前轻量关联方式为服务商联系邮箱与登录邮箱一致。完成入驻审核后即可维护服务能力。</p>
          <div className="mt-5 flex gap-3">
            <Link href="/providers/apply" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">服务商入驻</Link>
            <Link href="/providers" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-ink">服务商市场</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider Profile</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务能力设置</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">完善订单偏好后，机会池会优先展示符合你能力范围的项目。</p>
      </header>

      <form action={saveProviderCapability} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold text-ink">{provider.name}</h2>
          <p className="mt-1 text-sm text-ink/52">{provider.city ?? "城市待补充"} / {provider.contactEmail ?? "联系邮箱待补充"}</p>
        </div>
        <select name="orderPreference" defaultValue={provider.orderPreference} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          {Object.values(ProviderOrderPreference).map((value) => (
            <option key={value} value={value}>{PROVIDER_ORDER_PREFERENCE_LABELS[value]}</option>
          ))}
        </select>
        <select name="capacityStatus" defaultValue={provider.capacityStatus} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          {Object.values(ProviderCapacityStatus).map((value) => (
            <option key={value} value={value}>{PROVIDER_CAPACITY_STATUS_LABELS[value]}</option>
          ))}
        </select>
        <input name="minimumOrderQuantity" defaultValue={provider.minimumOrderQuantity ?? ""} placeholder="最低起订量" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="maximumOrderQuantity" defaultValue={provider.maximumOrderQuantity ?? ""} placeholder="最高承接量" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="sampleLeadDays" defaultValue={provider.sampleLeadDays ?? ""} placeholder="打样周期 / 天" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="productionLeadDays" defaultValue={provider.productionLeadDays ?? ""} placeholder="生产周期 / 天" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm"><input name="acceptsSampling" type="checkbox" defaultChecked={provider.acceptsSampling} />承接打样</label>
        <label className="flex items-center gap-2 text-sm"><input name="acceptsSmallBatch" type="checkbox" defaultChecked={provider.acceptsSmallBatch} />承接小单</label>
        <label className="flex items-center gap-2 text-sm"><input name="acceptsLargeOrder" type="checkbox" defaultChecked={provider.acceptsLargeOrder} />承接大货</label>
        <input name="supportedCategories" defaultValue={provider.supportedCategories ?? ""} placeholder="擅长品类，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <input name="preferredMaterials" defaultValue={provider.preferredMaterials ?? ""} placeholder="偏好面料，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <input name="preferredRegions" defaultValue={provider.preferredRegions ?? ""} placeholder="服务地区，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">保存服务能力</button>
      </form>
    </div>
  );
}
