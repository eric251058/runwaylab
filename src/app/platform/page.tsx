import type { Metadata } from "next";
import Link from "next/link";
import {
  PLATFORM_AVAILABILITY_LABELS,
  PLATFORM_JOURNEYS,
  PLATFORM_PERSONAS,
  PLATFORM_PRINCIPLES,
  PLATFORM_SALES_MODEL,
  PLATFORM_VERSION
} from "@/lib/platform-capabilities";

export const metadata: Metadata = {
  title: "平台全景｜RunwayLab",
  description: "从创意发布、项目协作到限量预售与达标生产，了解 RunwayLab 的完整业务链路。"
};

const availabilityStyle = {
  LIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-800 ring-amber-200",
  PLANNED: "bg-black/5 text-ink/55 ring-black/10"
} as const;

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-paper pb-24 text-ink">
      <section className="border-b border-black/8 bg-[radial-gradient(circle_at_top_left,_#f0e9ff,_transparent_42%),radial-gradient(circle_at_top_right,_#ffe9dc,_transparent_40%)]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/45">
            RunwayLab Platform · V{PLATFORM_VERSION}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-7xl">
            让创意走到成交，
            <br />
            不停在作品墙。
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-ink/65 md:text-lg">
            RunwayLab 把设计师、项目方、供应链和消费者放进同一个链路：
            作品被发现，需求变成项目，项目产品化，再通过限量预售验证真实市场。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/presale" className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">
              浏览限量预售
            </Link>
            <Link href="/start" className="inline-flex h-12 items-center rounded-full border border-black/15 bg-white/70 px-6 text-sm font-semibold">
              发起一个项目
            </Link>
            <Link href="/me/platform" className="inline-flex h-12 items-center rounded-full px-5 text-sm font-semibold text-ink/65 hover:bg-white/70">
              进入我的工作台 →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-5 py-16 md:px-8 md:py-24">
        <section className="overflow-hidden rounded-[20px] bg-ink text-white">
          <div className="grid gap-10 p-7 md:grid-cols-[0.9fr_1.1fr] md:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Core sales model</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">{PLATFORM_SALES_MODEL.label}</h2>
              <p className="mt-5 max-w-xl leading-7 text-white/65">{PLATFORM_SALES_MODEL.summary}</p>
              <div className="mt-7 rounded-[12px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/65">
                这是商品预售机制，不是投资或收益型众筹；平台不出售股权，也不承诺投资回报。
              </div>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {PLATFORM_SALES_MODEL.lifecycle.map((step, index) => (
                <li key={step} className="rounded-[12px] border border-white/10 bg-white/[0.06] p-5">
                  <span className="text-xs font-semibold text-white/35">{String(index + 1).padStart(2, "0")}</span>
                  <p className="mt-3 font-semibold">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/40">Three connected journeys</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">三条链路，一个平台对象体系</h2>
            <p className="mt-5 leading-7 text-ink/60">
              每一步都指向已经存在或正在补齐的真实操作入口。状态标签用于区分当前可用能力和后续交易建设，不把页面壳当作完成。
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLATFORM_JOURNEYS.map((journey) => (
              <article key={journey.id} className={`rounded-[18px] bg-gradient-to-br ${journey.accent} p-6 ring-1 ring-black/8`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">{journey.eyebrow}</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{journey.title}</h3>
                <p className="mt-3 min-h-14 text-sm leading-6 text-ink/60">{journey.summary}</p>
                <div className="mt-7 space-y-3">
                  {journey.stages.map((stage, index) => (
                    <Link key={stage.id} href={stage.href} className="block rounded-[12px] bg-white/80 p-4 ring-1 ring-black/8 transition hover:-translate-y-0.5 hover:bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-semibold text-ink/30">{index + 1}</span>
                          <h4 className="mt-1 font-semibold">{stage.label}</h4>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${availabilityStyle[stage.availability]}`}>
                          {PLATFORM_AVAILABILITY_LABELS[stage.availability]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/55">{stage.summary}</p>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/40">Choose your role</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">从你的角色开始</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/55">
              同一个账号未来可以拥有多个平台身份；V2.0B.6 先统一入口，后续再完成组织成员与多角色权限。
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PLATFORM_PERSONAS.map((persona) => (
              <Link key={persona.id} href={persona.primaryHref} className="group rounded-[14px] border border-black/10 bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(31,28,25,0.08)]">
                <h3 className="font-semibold">{persona.label}</h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-ink/55">{persona.summary}</p>
                <p className="mt-5 text-sm font-semibold">{persona.primaryAction} <span className="transition group-hover:translate-x-1">→</span></p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-[18px] border border-black/10 bg-white p-7 md:grid-cols-[0.8fr_1.2fr] md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/40">Trust by design</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">平台规则先于规模</h2>
          </div>
          <ul className="space-y-4">
            {PLATFORM_PRINCIPLES.map((principle, index) => (
              <li key={principle} className="flex gap-4 border-b border-black/8 pb-4 last:border-0 last:pb-0">
                <span className="text-xs font-semibold text-ink/30">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-sm leading-6 text-ink/65">{principle}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
