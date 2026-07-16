import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderShowcaseForm } from "@/components/provider-center/ProviderShowcaseForm";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { PROVIDER_TYPE_SHORT_LABELS, isOnboardingProviderType } from "@/lib/provider-onboarding";

export const dynamic = "force-dynamic";

export default async function NewProviderShowcasePage() {
  const { provider } = await getProviderCenterContext("/provider-center/showcase/new");
  if (!provider) redirect("/providers/apply");
  const title = provider.type === "FACTORY" ? "上传生产案例" : provider.type === "SAMPLE_STUDIO" ? "上传打样案例" : "新增案例";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">NEW CASE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink/52">{isOnboardingProviderType(provider.type) ? PROVIDER_TYPE_SHORT_LABELS[provider.type] : "服务商"}案例展示</p>
        </div>
        <Link href="/provider-center/showcase" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-ink">返回</Link>
      </header>
      <ProviderShowcaseForm providerType={provider.type} />
    </div>
  );
}
