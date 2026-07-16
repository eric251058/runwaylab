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
    <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-5 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Apply</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">选择你的服务商身份</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4">
          面料供应商、打样工作室和生产工厂可以通过不同路径入驻。审核通过后进入对应工作台，上传产品或案例。
        </p>
      </header>

      <SubmitProviderApplicationForm initialType={selectedType(params)} />
    </div>
  );
}
