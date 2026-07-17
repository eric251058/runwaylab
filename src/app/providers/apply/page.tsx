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
      <SubmitProviderApplicationForm initialType={selectedType(params)} />
    </main>
  );
}
