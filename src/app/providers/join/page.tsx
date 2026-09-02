import Link from "next/link";
import type { Metadata } from "next";
import { QuickProviderOnboardingForm } from "./QuickProviderOnboardingForm";

export const metadata: Metadata = {
  title: "服务商入驻",
  description: "加入 RunwayLab 服务商网络，展示真实产品、案例与可承接能力。"
};

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
            <p className="mt-3 text-sm leading-6 text-white/65">首批完成自助开通的真实服务商享 90 天共创期。我们会用询盘、响应与合作结果验证平台价值，不用虚假流量证明成功。</p>
            <Link href="#quick-apply" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink">3 分钟创建工作台</Link>
          </div>
        </div>
      </section>

      <section id="quick-apply" className="border-b border-black/8 bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">Start small</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">先建立联系，<br />再补齐资料</h2>
            <p className="mt-5 text-sm leading-7 text-ink/55">
              首次只提交建立工作台所需的信息。进入后由你逐步完善资料、案例和商品，不必等待平台逐项审核。
            </p>
            <ul className="mt-7 space-y-3 text-sm leading-6 text-ink/60">
              <li>01 · 不要求一次填完全部档案</li>
              <li>02 · 准备完成后由你自助公开</li>
              <li>03 · 不承诺订单、排名或收益</li>
            </ul>
          </div>
          <QuickProviderOnboardingForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <div className="rounded-[18px] border border-black/8 bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">First collaboration</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">先验证一次真实合作</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/58">
            当前阶段不收取会员费。先完善真实能力、产品和案例，再用询盘、响应与合作结果判断平台是否值得长期使用。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/providers" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">查看服务商网络</Link>
            <Link href="/providers/apply" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">填写完整资料</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
