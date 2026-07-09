import { ProviderWorkProposalStatus, ProviderWorkProposalType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveProviderWorkProposal } from "@/lib/provider-market-admin";
import { PROVIDER_PROPOSAL_STATUS_LABELS, PROVIDER_PROPOSAL_TYPE_LABELS, PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function operationHint(proposal: { description?: string | null; estimatedPrice?: string | null; estimatedTime?: string | null }) {
  if (proposal.description?.trim() && proposal.estimatedPrice?.trim() && proposal.estimatedTime?.trim()) {
    return "资料完整，建议优先联系设计师推进";
  }
  if (!proposal.description?.trim()) return "建议补充方案说明";
  if (!proposal.estimatedPrice?.trim()) return "建议补充预算 / 报价";
  if (!proposal.estimatedTime?.trim()) return "建议补充交付周期";
  return "值得继续跟进";
}

export default async function AdminProviderProposalsPage() {
  const [proposals, providers] = await Promise.all([
    prisma.providerWorkProposal.findMany({ include: { work: true, provider: true }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.provider.findMany({ orderBy: { name: "asc" } })
  ]);
  const pendingCount = proposals.filter((proposal) => proposal.status === ProviderWorkProposalStatus.PENDING).length;
  const completeCount = proposals.filter((proposal) => proposal.description && proposal.estimatedPrice && proposal.estimatedTime).length;
  const acceptedCount = proposals.filter((proposal) => proposal.status === ProviderWorkProposalStatus.ACCEPTED).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商方案</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">如果方案说明完整、预算明确、周期明确，优先联系设计师推进。不在这里做私信或通知。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">待设计师查看</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{pendingCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">需要运营协助推进</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">资料完整方案</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{completeCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">说明、预算和周期已填写</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">已采纳方案</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{acceptedCount}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">可继续推进合作项目</p>
        </div>
        <div className="rounded-[8px] border border-black/8 bg-white p-4">
          <p className="text-xs font-semibold text-ink/45">方案总数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{proposals.length}</p>
          <p className="mt-2 text-xs leading-5 text-ink/45">当前后台可查看方案</p>
        </div>
      </section>

      <form action={saveProviderWorkProposal} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="workId" required placeholder="作品 ID" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="providerId" required className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择服务商</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
        <select name="type" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalType).map((type) => <option key={type} value={type}>{PROVIDER_PROPOSAL_TYPE_LABELS[type]}</option>)}</select>
        <select name="status" defaultValue={ProviderWorkProposalStatus.PENDING} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalStatus).map((status) => <option key={status} value={status}>{PROVIDER_PROPOSAL_STATUS_LABELS[status]}</option>)}</select>
        <input name="title" required placeholder="方案标题" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <input name="estimatedPrice" placeholder="预计价格" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="estimatedTime" placeholder="预计周期" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="moq" placeholder="MOQ" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="attachments" placeholder="附件链接，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <textarea name="description" placeholder="方案说明" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">生成服务商方案</button>
      </form>

      <section className="mt-8 space-y-3">
        {proposals.length ? proposals.map((proposal) => (
          <form key={proposal.id} action={saveProviderWorkProposal} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={proposal.id} />
            <div className="md:col-span-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_PROPOSAL_TYPE_LABELS[proposal.type]}</span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_PROPOSAL_STATUS_LABELS[proposal.status]}</span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_TYPE_LABELS[proposal.provider.type]}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink">{proposal.title}</h2>
              <p className="mt-1 text-sm text-ink/52">服务商：{proposal.provider.name} / 关联作品：{proposal.work.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/58">
                {[proposal.estimatedTime && `周期 ${proposal.estimatedTime}`, proposal.estimatedPrice && `预算 / 报价 ${proposal.estimatedPrice}`, proposal.moq && `MOQ ${proposal.moq}`].filter(Boolean).join(" / ") || "周期和报价待补充"}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink/58">方案说明：{proposal.description || "说明待补充"}</p>
              <p className="mt-2 inline-flex rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">{operationHint(proposal)}</p>
              <p className="mt-2 text-xs text-ink/40">提交时间：{formatDate(proposal.createdAt)}</p>
            </div>
            <input name="workId" defaultValue={proposal.workId} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="providerId" defaultValue={proposal.providerId} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
            <select name="type" defaultValue={proposal.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalType).map((type) => <option key={type} value={type}>{PROVIDER_PROPOSAL_TYPE_LABELS[type]}</option>)}</select>
            <select name="status" defaultValue={proposal.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalStatus).map((status) => <option key={status} value={status}>{PROVIDER_PROPOSAL_STATUS_LABELS[status]}</option>)}</select>
            <input name="title" defaultValue={proposal.title} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <input name="estimatedPrice" defaultValue={proposal.estimatedPrice ?? ""} placeholder="价格" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="estimatedTime" defaultValue={proposal.estimatedTime ?? ""} placeholder="周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="moq" defaultValue={proposal.moq ?? ""} placeholder="MOQ" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="attachments" defaultValue={proposal.attachments.join(", ")} placeholder="附件" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-3" />
            <textarea name="description" defaultValue={proposal.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务商方案。</div>}
      </section>
    </div>
  );
}
