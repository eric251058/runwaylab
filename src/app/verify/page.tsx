import Link from "next/link";

export const dynamic = "force-dynamic";

const cards = [
  ["设计师 / 学生", "展示作品归属、孵化进度与合作履历。"],
  ["老师 / 学校", "用于课程展、挑战赛和推荐作品的可信展示。"],
  ["面料商 / 打样 / 工厂", "让产业方在项目匹配中更容易被识别。"],
  ["买手 / 采购商", "用于预售验证、采购意向和合作反馈。"]
];

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Verification</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">平台认证</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">
          认证用于提升合作可信度，帮助设计师、老师、学校、服务商和买手在 RunwayLab 的商业协作框架中被正确识别。本阶段只做平台审核，不接入实名接口。
        </p>
        <Link href="/me/verification" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          提交认证申请
        </Link>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.map(([title, description]) => (
          <article key={title} className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/56">{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
