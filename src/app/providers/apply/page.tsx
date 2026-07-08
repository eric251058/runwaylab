import { SubmitProviderApplicationForm } from "@/app/providers/apply/SubmitProviderApplicationForm";

export default function ProviderApplyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Apply</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商入驻</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">当前只收集入驻申请，不做认证收费。平台审核后会联系你完善服务商主页。</p>
      </header>
      <SubmitProviderApplicationForm />
    </div>
  );
}
