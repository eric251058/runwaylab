import { ProviderApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reviewProviderApplication } from "@/lib/provider-market-admin";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

export default async function AdminProviderApplicationsPage() {
  const applications = await prisma.providerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">入驻审核</h1>
      </header>
      <section className="space-y-3">
        {applications.length ? applications.map((application) => (
          <article key={application.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_TYPE_LABELS[application.providerType]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{application.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{application.companyName}</h2>
                <p className="mt-1 text-sm text-ink/52">{application.contactName} / {application.phone ?? application.email ?? application.wechat ?? "联系方式待补充"} / {application.city ?? "城市待补充"}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">{application.description ?? "简介待补充"}</p>
              </div>
              <div className="grid gap-2 md:w-72">
                {[ProviderApplicationStatus.APPROVED, ProviderApplicationStatus.REJECTED].map((status) => (
                  <form key={status} action={reviewProviderApplication} className="grid gap-2">
                    <input type="hidden" name="id" value={application.id} />
                    <input type="hidden" name="status" value={status} />
                    <input name="reviewNote" placeholder="审核备注" className="h-9 rounded-[6px] border border-black/10 px-3 text-xs" />
                    <button className="h-9 rounded-full border border-black/10 px-3 text-xs font-semibold">{status === "APPROVED" ? "通过并生成服务商" : "拒绝"}</button>
                  </form>
                ))}
              </div>
            </div>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无入驻申请。</div>}
      </section>
    </div>
  );
}
