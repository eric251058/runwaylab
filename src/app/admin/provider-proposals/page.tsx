import { ProviderWorkProposalStatus, ProviderWorkProposalType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveProviderWorkProposal } from "@/lib/provider-market-admin";
import { PROVIDER_PROPOSAL_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

export default async function AdminProviderProposalsPage() {
  const [proposals, providers] = await Promise.all([
    prisma.providerWorkProposal.findMany({ include: { work: true, provider: true }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.provider.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">服务商方案</h1>
      </header>
      <form action={saveProviderWorkProposal} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="workId" required placeholder="作品 ID" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="providerId" required className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择服务商</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
        <select name="type" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalType).map((type) => <option key={type} value={type}>{PROVIDER_PROPOSAL_TYPE_LABELS[type]}</option>)}</select>
        <select name="status" defaultValue={ProviderWorkProposalStatus.PENDING} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
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
            <input name="workId" defaultValue={proposal.workId} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="providerId" defaultValue={proposal.providerId} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
            <select name="type" defaultValue={proposal.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalType).map((type) => <option key={type} value={type}>{PROVIDER_PROPOSAL_TYPE_LABELS[type]}</option>)}</select>
            <select name="status" defaultValue={proposal.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{Object.values(ProviderWorkProposalStatus).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <input name="title" defaultValue={proposal.title} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <input name="estimatedPrice" defaultValue={proposal.estimatedPrice ?? ""} placeholder="价格" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="estimatedTime" defaultValue={proposal.estimatedTime ?? ""} placeholder="周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="moq" defaultValue={proposal.moq ?? ""} placeholder="MOQ" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="attachments" defaultValue={proposal.attachments.join(", ")} placeholder="附件" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-3" />
            <textarea name="description" defaultValue={proposal.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">作品：{proposal.work.title} / 服务商：{proposal.provider.name}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务商方案。</div>}
      </section>
    </div>
  );
}
