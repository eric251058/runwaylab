import Link from "next/link";
import { SubmitProviderApplicationForm } from "@/app/providers/apply/SubmitProviderApplicationForm";

type ProviderApplyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function selectedType(params: Record<string, string | string[] | undefined> | undefined) {
  const value = params?.type;
  const text = Array.isArray(value) ? value[0] : value;
  return text === "FABRIC_SUPPLIER" || text === "SAMPLE_STUDIO" || text === "FACTORY" ? text : null;
}

export default async function ProviderApplyPage({ searchParams }: ProviderApplyPageProps) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-12">
      <div className="mb-5 flex flex-col gap-3 rounded-[12px] border border-black/8 bg-white p-4 text-sm text-ink/58 sm:flex-row sm:items-center sm:justify-between">
        <p>首批真实服务商可申请 90 天共创期；平台不承诺订单，不出售认证或虚假排名。</p>
        <Link href="/providers/join" className="shrink-0 font-semibold text-ink underline underline-offset-4">查看套餐与规则</Link>
      </div>
      <SubmitProviderApplicationForm initialType={selectedType(params)} />
    </main>
  );
}
