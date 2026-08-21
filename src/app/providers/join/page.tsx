import Link from "next/link";
import { PROVIDER_MEMBERSHIP_PLANS } from "@/lib/provider-membership";

const steps = [
  ["01", "提交真实资料", "填写服务能力、地区、MOQ、周期与联系方式。"],
  ["02", "平台审核", "核对身份与能力，不出售认证标识。"],
  ["03", "建立可信主页", "上传产品、案例和可承接范围。"],
  ["04", "接收真实需求", "通过站内询盘沟通，双方自行确认报价与履约。"]
] as const;

export default function ProviderJoinPage() {
  return (
    <main className="bg-paper text-ink">
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/38">RunwayLab Provider Network</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl">让真实能力被看见，<br />让合作更快发生。</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink/58">面料商、打样工作室与工厂可以建立能力主页、发布产品和案例、接收设计师与项目方的真实需求。平台提供连接与工具，不替任何一方报价、承诺订单或决定合作。</p>
          </div>
          <div className="rounded-[18px] bg-ink p-6 text-white">
            <p className="text-sm font-semibold text-white/55">首批招募原则</p>
            <p className="mt-3 text-2xl font-semibold">先验证价值，再开始收费</p>
            <p className="mt-3 text-sm leading-6 text-white/65">首批通过审核的真实服务商享 90 天共创期。我们会用询盘、响应与合作结果验证平台价值，不用虚假流量证明成功。</p>
            <Link href="/providers/apply" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink">申请首批入驻</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-black/8 bg-white">
        <div className="mx-auto grid max-w-6xl gap-px bg-black/8 md:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <article key={number} className="bg-white p-6">
              <p className="text-xs font-semibold text-ink/30">{number}</p>
              <h2 className="mt-6 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/55">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">Pricing</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">清楚收费，不出售虚假曝光</h2>
          <p className="mt-4 text-sm leading-7 text-ink/55">正式收费前，平台会公布权益、周期和退出规则。在线支付尚未开放，当前不会自动扣款。</p>
        </div>
        <div className="mt-9 grid gap-4 lg:grid-cols-4">
          {PROVIDER_MEMBERSHIP_PLANS.map((plan) => (
            <article key={plan.id} className={`flex flex-col rounded-[16px] border p-5 ${plan.recommended ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}>
              <div className="min-h-36">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.recommended ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink">推荐</span> : null}
                </div>
                <p className={`mt-4 text-2xl font-semibold ${plan.recommended ? "text-white" : "text-ink"}`}>{plan.priceLabel}</p>
                <p className={`mt-3 text-sm leading-6 ${plan.recommended ? "text-white/65" : "text-ink/52"}`}>{plan.description}</p>
              </div>
              <ul className={`mt-5 space-y-2 border-t pt-5 text-sm ${plan.recommended ? "border-white/15 text-white/80" : "border-black/8 text-ink/65"}`}>
                {plan.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}
              </ul>
              <ul className={`mt-5 space-y-2 text-xs leading-5 ${plan.recommended ? "text-white/45" : "text-ink/42"}`}>
                {plan.limits.map((limit) => <li key={limit}>— {limit}</li>)}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/providers/apply" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white">申请成为服务商</Link>
          <Link href="/providers" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-ink">查看服务商网络</Link>
        </div>
      </section>
    </main>
  );
}

