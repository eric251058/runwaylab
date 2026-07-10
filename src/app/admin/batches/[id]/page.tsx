import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchProviderRole, BatchProviderStatus, BatchWorkStatus, IncubationBatchStatus, IncubationBatchType } from "@prisma/client";
import {
  BATCH_PROVIDER_ROLE_LABELS,
  BATCH_PROVIDER_STATUS_LABELS,
  BATCH_WORK_STATUS_LABELS,
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  removeBatchWork,
  saveBatchProvider,
  saveBatchWork,
  saveIncubationBatch
} from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminBatchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function numberValue(value?: number | null) {
  return value ?? "";
}

function decimalValue(value?: { toString(): string } | null) {
  return value ? value.toString() : "";
}

function stat(label: string, value: string | number) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function AdminBatchDetailPage({ params }: AdminBatchDetailPageProps) {
  const { id } = await params;
  const [batch, schools, challenges, providers] = await Promise.all([
    prisma.incubationBatch.findUnique({
      where: { id },
      include: {
        school: true,
        challenge: true,
        works: {
          include: {
            work: {
              include: {
                user: true,
                images: { take: 1 },
                teacherRecommendations: true,
                fabricRecommendations: true,
                providerWorkProposals: true,
                presaleCampaignIntents: true,
                buyerIntents: true,
                votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
                opportunityProfile: true
              }
            }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
        },
        providers: {
          include: { provider: true },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }]
        }
      }
    }),
    prisma.school.findMany({ orderBy: { name: "asc" }, take: 100 }),
    prisma.challenge.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, take: 200 })
  ]);

  if (!batch) notFound();

  const stats = calculateBatchStats(batch);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/admin/batches" className="text-sm font-semibold text-ink/55 hover:text-ink">返回批次管理</Link>
      <header className="mt-5 mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Batch Admin</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{batch.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58">{batch.summary}</p>
        </div>
        {batch.adminApproved ? <Link href={`/batches/${batch.slug}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">查看公开页</Link> : null}
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stat("提交作品", stats.workCount)}
        {stat("候选作品", stats.shortlistedWorkCount)}
        {stat("入选作品", stats.selectedWorkCount)}
        {stat("打样中", stats.samplingWorkCount)}
        {stat("验证中", stats.validatingWorkCount)}
        {stat("生产准备", stats.productionReadyWorkCount)}
        {stat("参与服务商", stats.providerCount)}
        {stat("确认服务商", stats.confirmedProviderCount)}
        {stat("目标数量", stats.targetProductionQuantity)}
        {stat("确认数量", stats.confirmedProductionQuantity)}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">编辑基本资料</h2>
        <form action={saveIncubationBatch} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="id" value={batch.id} />
          <input name="title" required defaultValue={batch.title} placeholder="标题" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
          <input name="slug" required defaultValue={batch.slug} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="organizerName" required defaultValue={batch.organizerName} placeholder="组织方" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <select name="type" defaultValue={batch.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(IncubationBatchType).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_TYPE_LABELS[value]}</option>)}
          </select>
          <select name="status" defaultValue={batch.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(IncubationBatchStatus).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_STATUS_LABELS[value]}</option>)}
          </select>
          <select name="schoolId" defaultValue={batch.schoolId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="">关联学校</option>
            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select>
          <select name="challengeId" defaultValue={batch.challengeId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            <option value="">关联挑战赛</option>
            {challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}
          </select>
          <input name="organizerType" defaultValue={batch.organizerType ?? ""} placeholder="组织方类型" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="city" defaultValue={batch.city ?? ""} placeholder="城市" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="coverImage" defaultValue={batch.coverImage ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
          <input name="startDate" type="date" defaultValue={dateInput(batch.startDate)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="submissionDeadline" type="date" defaultValue={dateInput(batch.submissionDeadline)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="evaluationDeadline" type="date" defaultValue={dateInput(batch.evaluationDeadline)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetCompletionDate" type="date" defaultValue={dateInput(batch.targetCompletionDate)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetWorkCount" defaultValue={numberValue(batch.targetWorkCount)} placeholder="目标作品数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetSampleCount" defaultValue={numberValue(batch.targetSampleCount)} placeholder="目标样衣数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetProductionQuantity" defaultValue={numberValue(batch.targetProductionQuantity)} placeholder="目标生产数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="confirmedProductionQuantity" defaultValue={numberValue(batch.confirmedProductionQuantity)} placeholder="确认生产数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="estimatedFabricMeters" defaultValue={decimalValue(batch.estimatedFabricMeters)} placeholder="预计面料米数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetCategories" defaultValue={batch.targetCategories ?? ""} placeholder="目标品类" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetMaterials" defaultValue={batch.targetMaterials ?? ""} placeholder="目标面料" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetPriceRange" defaultValue={batch.targetPriceRange ?? ""} placeholder="目标价格带" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="targetMarket" defaultValue={batch.targetMarket ?? ""} placeholder="目标市场" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <textarea name="summary" required defaultValue={batch.summary} placeholder="一句说明" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
          <textarea name="description" defaultValue={batch.description ?? ""} placeholder="详细说明" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
          <textarea name="publicNote" defaultValue={batch.publicNote ?? ""} placeholder="公开说明" className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
          <textarea name="adminNote" defaultValue={batch.adminNote ?? ""} placeholder="后台备注" className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
          <label className="flex items-center gap-2 text-sm"><input name="adminApproved" type="checkbox" defaultChecked={batch.adminApproved} />审核公开</label>
          <label className="flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={batch.featured} />精选</label>
          <label className="flex items-center gap-2 text-sm"><input name="expectedRepeatOrder" type="checkbox" defaultChecked={batch.expectedRepeatOrder} />有补单预期</label>
          <button className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-4">保存批次</button>
        </form>
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">添加作品</h2>
        <form action={saveBatchWork} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="batchId" value={batch.id} />
          <input name="workId" required placeholder="作品 ID" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <select name="status" defaultValue={BatchWorkStatus.NOMINATED} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(BatchWorkStatus).map((value) => <option key={value} value={value}>{BATCH_WORK_STATUS_LABELS[value]}</option>)}
          </select>
          <input name="sortOrder" placeholder="排序" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="nominationReason" placeholder="推荐理由" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white md:col-span-4">保存作品</button>
        </form>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">批次作品</h2>
        {batch.works.length ? batch.works.map((item) => (
          <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-semibold text-ink">{item.work.title}</h3>
                <p className="mt-1 text-sm text-ink/52">{item.work.user.nickname} / {BATCH_WORK_STATUS_LABELS[item.status]}</p>
              </div>
              <Link href={`/works/${item.workId}`} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink">查看作品</Link>
            </div>
            <form action={saveBatchWork} className="grid gap-2 md:grid-cols-5">
              <input type="hidden" name="batchId" value={batch.id} />
              <input type="hidden" name="workId" value={item.workId} />
              <select name="status" defaultValue={item.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                {Object.values(BatchWorkStatus).map((value) => <option key={value} value={value}>{BATCH_WORK_STATUS_LABELS[value]}</option>)}
              </select>
              <input name="sortOrder" defaultValue={item.sortOrder} placeholder="排序" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="nominationReason" defaultValue={item.nominationReason ?? ""} placeholder="推荐理由" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="reviewNote" defaultValue={item.reviewNote ?? ""} placeholder="评审备注" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
            </form>
            <form action={removeBatchWork} className="mt-2">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="batchId" value={batch.id} />
              <button className="text-xs font-semibold text-red-600">移除作品</button>
            </form>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无作品。</div>}
      </section>

      <section className="mb-6 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">添加或审核服务商</h2>
        <form action={saveBatchProvider} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="batchId" value={batch.id} />
          <select name="providerId" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
          <select name="role" defaultValue={BatchProviderRole.SAMPLE_SUPPORT} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(BatchProviderRole).map((value) => <option key={value} value={value}>{BATCH_PROVIDER_ROLE_LABELS[value]}</option>)}
          </select>
          <select name="status" defaultValue={BatchProviderStatus.INTERESTED} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
            {Object.values(BatchProviderStatus).map((value) => <option key={value} value={value}>{BATCH_PROVIDER_STATUS_LABELS[value]}</option>)}
          </select>
          <input name="note" placeholder="说明" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="minimumQuantity" placeholder="最低数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="maximumQuantity" placeholder="最高数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="expectedPriceMin" placeholder="最低价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="expectedPriceMax" placeholder="最高价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="sampleLeadDays" placeholder="打样周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <input name="productionLeadDays" placeholder="生产周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white md:col-span-2">保存服务商</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">服务商申请</h2>
        {batch.providers.length ? batch.providers.map((item) => (
          <article key={item.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-ink">{item.provider.name}</h3>
              <p className="mt-1 text-sm text-ink/52">{BATCH_PROVIDER_ROLE_LABELS[item.role]} / {BATCH_PROVIDER_STATUS_LABELS[item.status]} / {item.provider.contactPhone ?? item.provider.contactEmail ?? "联系方式待补充"}</p>
            </div>
            <form action={saveBatchProvider} className="grid gap-2 md:grid-cols-5">
              <input type="hidden" name="batchId" value={batch.id} />
              <input type="hidden" name="providerId" value={item.providerId} />
              <select name="role" defaultValue={item.role} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                {Object.values(BatchProviderRole).map((value) => <option key={value} value={value}>{BATCH_PROVIDER_ROLE_LABELS[value]}</option>)}
              </select>
              <select name="status" defaultValue={item.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                {Object.values(BatchProviderStatus).map((value) => <option key={value} value={value}>{BATCH_PROVIDER_STATUS_LABELS[value]}</option>)}
              </select>
              <input name="note" defaultValue={item.note ?? ""} placeholder="说明" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="minimumQuantity" defaultValue={numberValue(item.minimumQuantity)} placeholder="最低数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="maximumQuantity" defaultValue={numberValue(item.maximumQuantity)} placeholder="最高数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="expectedPriceMin" defaultValue={decimalValue(item.expectedPriceMin)} placeholder="最低价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="expectedPriceMax" defaultValue={decimalValue(item.expectedPriceMax)} placeholder="最高价" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="sampleLeadDays" defaultValue={numberValue(item.sampleLeadDays)} placeholder="打样周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="productionLeadDays" defaultValue={numberValue(item.productionLeadDays)} placeholder="生产周期" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
              <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">保存</button>
            </form>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无服务商申请。</div>}
      </section>
    </div>
  );
}
