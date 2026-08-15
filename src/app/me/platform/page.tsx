import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  PLATFORM_AVAILABILITY_LABELS,
  PLATFORM_JOURNEYS,
  PLATFORM_PERSONAS,
  PLATFORM_SALES_MODEL
} from "@/lib/platform-capabilities";

export const dynamic = "force-dynamic";

const statusStyle = {
  LIVE: "bg-emerald-50 text-emerald-800",
  PARTIAL: "bg-amber-50 text-amber-800",
  PLANNED: "bg-black/5 text-ink/50"
} as const;

export default async function MyPlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/platform");

  const personas = PLATFORM_PERSONAS.filter((persona) => persona.id !== "operator" || user.role === "ADMIN");

  return (
    <main className="min-h-screen bg-paper pb-24 text-ink">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="rounded-[20px] bg-ink p-7 text-white md:p-11">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">My RunwayLab</p>
          <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
                {user.nickname ?? user.email}，从这里推进整条链路
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-white/60">
                作品、项目和订单不再是分散入口。选择你现在要完成的任务，平台会带你进入对应工作区。
              </p>
            </div>
            <Link href="/platform" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold">
              查看平台全景
            </Link>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/40">Current task</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">我现在要做什么？</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/55">同一账号可以参与不同链路；运营权限仍由服务端身份控制。</p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {personas.map((persona) => (
              <Link key={persona.id} href={persona.primaryHref} className="rounded-[14px] border border-black/10 bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(31,28,25,0.08)]">
                <h3 className="font-semibold">{persona.label}</h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-ink/55">{persona.summary}</p>
                <p className="mt-5 text-sm font-semibold">{persona.primaryAction} →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          {PLATFORM_JOURNEYS.map((journey) => (
            <article key={journey.id} className="rounded-[16px] border border-black/10 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">{journey.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-semibold">{journey.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/55">{journey.summary}</p>
              <div className="mt-6 space-y-3">
                {journey.stages.map((stage) => (
                  <Link key={stage.id} href={stage.href} className="flex items-center justify-between gap-4 rounded-[10px] bg-paper px-4 py-3 transition hover:bg-black/[0.06]">
                    <div>
                      <p className="text-sm font-semibold">{stage.label}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-ink/45">{stage.summary}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[stage.availability]}`}>
                      {PLATFORM_AVAILABILITY_LABELS[stage.availability]}
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[16px] border border-black/10 bg-[linear-gradient(120deg,#fff1e8,#f1ecff)] p-7 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">Core commerce</p>
            <h2 className="mt-3 text-2xl font-semibold">{PLATFORM_SALES_MODEL.label}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{PLATFORM_SALES_MODEL.summary}</p>
          </div>
          <Link href="/presale" className="mt-6 inline-flex h-11 shrink-0 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white md:mt-0">
            查看当前预售
          </Link>
        </section>
      </div>
    </main>
  );
}
