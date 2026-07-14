import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderShowcaseForm } from "@/components/provider-center/ProviderShowcaseForm";
import { getProviderCenterContext } from "@/lib/provider-center-context";

export const dynamic = "force-dynamic";

export default async function NewProviderShowcasePage() {
  const { provider } = await getProviderCenterContext("/provider-center/showcase/new");
  if (!provider) redirect("/providers/apply");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">NEW CASE</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">新增案例</h1>
        </div>
        <Link href="/provider-center/showcase" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold text-ink">返回</Link>
      </header>
      <ProviderShowcaseForm />
    </div>
  );
}
