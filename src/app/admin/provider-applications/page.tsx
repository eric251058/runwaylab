import { ProviderApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reviewProviderApplication } from "@/lib/provider-market-admin";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

const providerApplicationStatusLabels: Record<ProviderApplicationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function contactText(application: { phone?: string | null; email?: string | null; wechat?: string | null }) {
  return [application.phone && `手机 ${application.phone}`, application.email && `邮箱 ${application.email}`, application.wechat && `微信 ${application.wechat}`].filter(Boolean).join(" / ") || "联系方式待补充";
}

export default async function AdminProviderApplicationsPage() {
  const applications = await prisma.providerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  const pendingCount = applications.filter((application) => application.status === ProviderApplicationStatus.PENDING).length;
  const completeCount = applications.filter((application) => application.city && application.description && (application.phone || application.email || application.wechat)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">入驻审核</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">这里用于筛选面料商、打样工作室、工厂和买手等服务商。优先处理资料完整、有明确服务能力的申请。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">待处理申请</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{pendingCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">需要运营审核的服务商申请</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">资料较完整</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{completeCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">已填写城市、能力说明和联系方式</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">申请总数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{applications.length}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">当前后台可查看的入驻申请</p>
        </div>
      </section>

      <section className="space-y-3">
        {applications.length ? applications.map((application) => (
          <article key={application.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_TYPE_LABELS[application.providerType]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{providerApplicationStatusLabels[application.status]}</span>
                  {application.city ? <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{application.city}</span> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">{application.companyName}</h2>
                <p className="mt-1 text-sm text-ink/52">申请人：{application.contactName} / {contactText(application)}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">能力说明：{application.description ?? "简介待补充"}</p>
                <p className="mt-1 text-xs text-ink/40">申请时间：{formatDate(application.createdAt)}</p>
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
