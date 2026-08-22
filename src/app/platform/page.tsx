import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "平台如何运作",
  description: "了解 RunwayLab 如何连接设计、项目、样衣、需求验证与小单生产。"
};

const lifecycle = [
  { number: "01", title: "发现设计", description: "让作品被看见，也让真实反馈回到创作者。" },
  { number: "02", title: "启动项目", description: "把已有作品或产品想法整理成可推进的项目。" },
  { number: "03", title: "制作样衣", description: "按项目需要连接面料、打样与生产服务。" },
  { number: "04", title: "验证需求", description: "用明确、可追踪的用户反馈判断市场意愿。" },
  { number: "05", title: "小单生产", description: "条件成熟后，再由项目相关方决定是否进入生产。" }
] as const;

const roles = [
  {
    title: "设计师与创作者",
    description: "发布作品、积累反馈，并自主决定是否进入合作与产品开发。",
    href: "/publish",
    action: "发布作品"
  },
  {
    title: "品牌与项目主理人",
    description: "从作品或产品想法出发，逐步明确产品并连接所需资源。",
    href: "/start",
    action: "启动项目"
  },
  {
    title: "供应链服务商",
    description: "展示真实能力与产品，围绕明确项目获得合作机会。",
    href: "/providers/join",
    action: "了解入驻"
  }
] as const;

const principles = [
  "作品作者自主决定授权，平台不替任何一方作出合作决定。",
  "服务商、产品和案例经过归属核验后，才进入公开展示与合作路径。",
  "需求反馈不等于付款或订单；生产、价格与交付由相关方另行确认。",
  "平台记录关键状态与操作，为合作双方保留清晰、可追踪的依据。"
] as const;

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-paper pb-24 text-ink">
      <section className="border-b border-black/8 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/40">RunwayLab</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-7xl">
            让好设计，
            <br />
            走向真实产品。
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-ink/62 md:text-lg">
            RunwayLab 把作品、项目与供应链放在同一条清晰路径里。每个人只处理与自己相关的下一步，让合作建立在真实信息和自主决定之上。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/start" className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">
              启动服装项目
            </Link>
            <Link href="/works" className="inline-flex h-12 items-center rounded-full border border-black/12 px-6 text-sm font-semibold text-ink">
              浏览新锐设计
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-5 py-16 md:px-8 md:py-24">
        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/38">One clear path</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">一条路径，逐步向前</h2>
            <p className="mt-5 leading-7 text-ink/58">不要求任何人一开始就准备完整商业计划。先完成当前最重要的一步，后续能力会随着项目进展出现。</p>
          </div>
          <ol className="mt-10 grid gap-3 md:grid-cols-5">
            {lifecycle.map((step) => (
              <li key={step.number} className="rounded-[12px] border border-black/8 bg-white p-5">
                <span className="text-xs font-semibold text-ink/28">{step.number}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/55">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/38">Start from your role</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">从你现在的位置开始</h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {roles.map((role) => (
              <article key={role.title} className="rounded-[14px] border border-black/8 bg-white p-6">
                <h3 className="text-xl font-semibold">{role.title}</h3>
                <p className="mt-3 min-h-16 text-sm leading-7 text-ink/56">{role.description}</p>
                <Link href={role.href} className="mt-6 inline-flex text-sm font-semibold text-ink">
                  {role.action} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 rounded-[18px] bg-ink p-7 text-white md:grid-cols-[0.8fr_1.2fr] md:p-11">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38">Trust by design</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">规则先于规模</h2>
          </div>
          <ol className="space-y-4">
            {principles.map((principle, index) => (
              <li key={principle} className="flex gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                <span className="text-xs font-semibold text-white/28">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-sm leading-7 text-white/68">{principle}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
