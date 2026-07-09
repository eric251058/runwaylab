import { SubmitProviderApplicationForm } from "@/app/providers/apply/SubmitProviderApplicationForm";

const providerRoles = [
  {
    title: "面料商",
    description: "推荐合适面料。"
  },
  {
    title: "打样工作室",
    description: "提交打样方案。"
  },
  {
    title: "服装工厂",
    description: "提交小批量生产方案。"
  },
  {
    title: "买手 / 采购商",
    description: "提供选品和采购反馈。"
  }
];

export default function ProviderApplyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-12">
      <header className="mb-5 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Apply</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">成为 RunwayLab 服务商</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 md:mt-4">为优秀设计作品提供面料、打样、生产或买手反馈，参与新锐设计孵化。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        {providerRoles.map((role) => (
          <div key={role.title} className="rounded-[8px] border border-black/8 bg-white p-4">
            <h2 className="text-base font-semibold text-ink">{role.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">{role.description}</p>
          </div>
        ))}
      </section>

      <SubmitProviderApplicationForm />
    </div>
  );
}
