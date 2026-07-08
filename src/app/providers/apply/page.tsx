import { SubmitProviderApplicationForm } from "@/app/providers/apply/SubmitProviderApplicationForm";
import { ActionGuide } from "@/components/ActionGuide";

const providerRoles = [
  {
    title: "面料商",
    description: "推荐适合作品风格和预算的面料，并说明成分、克重、价格区间。"
  },
  {
    title: "打样工作室",
    description: "提供纸样、样衣、工艺建议和打样周期参考。"
  },
  {
    title: "服装工厂",
    description: "说明可生产品类、起订量、周期和参考单价。"
  },
  {
    title: "买手 / 采购商",
    description: "围绕作品提交采购意向、渠道反馈和市场建议。"
  }
];

export default function ProviderApplyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Apply</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">成为 RunwayLab 服务商</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">你可以为优秀设计作品提供面料、打样、生产、买手反馈等方案。当前只收集入驻申请，不做认证收费。</p>
      </header>

      <div className="mb-6">
        <ActionGuide
          eyebrow="Provider Path"
          title="入驻后，平台会协助你参与作品孵化方案提交。"
          description="本阶段不涉及真实交易、订单或支付。请先提交服务能力和联系方式，审核后再由平台运营协助匹配作品。"
          actions={[
            { label: "查看孵化作品", href: "/incubation", primary: true },
            { label: "浏览服务商市场", href: "/providers" }
          ]}
        />
      </div>

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
