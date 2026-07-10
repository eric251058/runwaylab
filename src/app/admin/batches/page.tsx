import Link from "next/link";
import { IncubationBatchStatus, IncubationBatchType, type IncubationBatch, type Prisma } from "@prisma/client";
import {
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  saveIncubationBatch
} from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminBatchesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function numberValue(value?: number | null) {
  return value ?? "";
}

function decimalValue(value?: { toString(): string } | null) {
  return value ? value.toString() : "";
}

function BatchForm({ schools, challenges, batch }: {
  schools: Array<{ id: string; name: string }>;
  challenges: Array<{ id: string; title: string }>;
  batch?: IncubationBatch;
}) {
  return (
    <form action={saveIncubationBatch} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-4">
      {batch ? <input type="hidden" name="id" value={batch.id} /> : null}
      <input name="title" required defaultValue={batch?.title ?? ""} placeholder="批次标题" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
      <input name="slug" required defaultValue={batch?.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="organizerName" required defaultValue={batch?.organizerName ?? ""} placeholder="组织方" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <select name="type" defaultValue={batch?.type ?? IncubationBatchType.OTHER} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
        {Object.values(IncubationBatchType).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_TYPE_LABELS[value]}</option>)}
      </select>
      <select name="status" defaultValue={batch?.status ?? IncubationBatchStatus.DRAFT} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
        {Object.values(IncubationBatchStatus).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_STATUS_LABELS[value]}</option>)}
      </select>
      <select name="schoolId" defaultValue={batch?.schoolId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
        <option value="">关联学校</option>
        {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
      </select>
      <select name="challengeId" defaultValue={batch?.challengeId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
        <option value="">关联挑战赛</option>
        {challenges.map((challenge) => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}
      </select>
      <input name="organizerType" defaultValue={batch?.organizerType ?? ""} placeholder="组织方类型" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="city" defaultValue={batch?.city ?? ""} placeholder="城市" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="coverImage" defaultValue={batch?.coverImage ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
      <input name="startDate" type="date" defaultValue={dateInput(batch?.startDate)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="submissionDeadline" type="date" defaultValue={dateInput(batch?.submissionDeadline)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="evaluationDeadline" type="date" defaultValue={dateInput(batch?.evaluationDeadline)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetCompletionDate" type="date" defaultValue={dateInput(batch?.targetCompletionDate)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetWorkCount" defaultValue={numberValue(batch?.targetWorkCount)} placeholder="目标作品数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetSampleCount" defaultValue={numberValue(batch?.targetSampleCount)} placeholder="目标样衣数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetProductionQuantity" defaultValue={numberValue(batch?.targetProductionQuantity)} placeholder="目标生产数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="confirmedProductionQuantity" defaultValue={numberValue(batch?.confirmedProductionQuantity)} placeholder="确认生产数量" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="estimatedFabricMeters" defaultValue={decimalValue(batch?.estimatedFabricMeters)} placeholder="预计面料米数" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetCategories" defaultValue={batch?.targetCategories ?? ""} placeholder="目标品类" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetMaterials" defaultValue={batch?.targetMaterials ?? ""} placeholder="目标面料" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetPriceRange" defaultValue={batch?.targetPriceRange ?? ""} placeholder="目标价格带" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="targetMarket" defaultValue={batch?.targetMarket ?? ""} placeholder="目标市场" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="summary" required defaultValue={batch?.summary ?? ""} placeholder="一句说明" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="description" defaultValue={batch?.description ?? ""} placeholder="详细说明" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="publicNote" defaultValue={batch?.publicNote ?? ""} placeholder="公开说明" className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="adminNote" defaultValue={batch?.adminNote ?? ""} placeholder="后台备注" className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <label className="flex items-center gap-2 text-sm"><input name="adminApproved" type="checkbox" defaultChecked={batch?.adminApproved ?? false} />审核公开</label>
      <label className="flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={batch?.featured ?? false} />精选</label>
      <label className="flex items-center gap-2 text-sm"><input name="expectedRepeatOrder" type="checkbox" defaultChecked={batch?.expectedRepeatOrder ?? false} />有补单预期</label>
      <button className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-4">{batch ? "保存批次" : "创建批次"}</button>
    </form>
  );
}

export default async function AdminBatchesPage({ searchParams }: AdminBatchesPageProps) {
  const params = await searchParams;
  const type = firstValue(params?.type);
  const status = firstValue(params?.status);
  const approved = firstValue(params?.approved);
  const organizer = firstValue(params?.organizer);

  const where: Prisma.IncubationBatchWhereInput = {
    ...(type && Object.values(IncubationBatchType).includes(type as IncubationBatchType) ? { type: type as IncubationBatchType } : {}),
    ...(status && Object.values(IncubationBatchStatus).includes(status as IncubationBatchStatus) ? { status: status as IncubationBatchStatus } : {}),
    ...(approved === "true" ? { adminApproved: true } : approved === "false" ? { adminApproved: false } : {}),
    ...(organizer ? { organizerName: { contains: organizer, mode: "insensitive" } } : {})
  };

  const [batches, schools, challenges] = await Promise.all([
    prisma.incubationBatch.findMany({
      where,
      include: {
        works: {
          include: {
            work: {
              include: {
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
          }
        },
        providers: true
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.school.findMany({ orderBy: { name: "asc" }, take: 100 }),
    prisma.challenge.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">批次管理</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">创建和审核孵化批次，聚合课程、挑战赛、买手选品、小单试产等机会。</p>
      </header>

      <section className="mb-6">
        <BatchForm schools={schools} challenges={challenges} />
      </section>

      <form className="mb-4 grid gap-2 rounded-[8px] border border-black/8 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部类型</option>
          {Object.values(IncubationBatchType).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_TYPE_LABELS[value]}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部状态</option>
          {Object.values(IncubationBatchStatus).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_STATUS_LABELS[value]}</option>)}
        </select>
        <select name="approved" defaultValue={approved ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部审核状态</option>
          <option value="true">已公开</option>
          <option value="false">未公开</option>
        </select>
        <input name="organizer" defaultValue={organizer ?? ""} placeholder="组织方" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
        <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">筛选</button>
      </form>

      <section className="space-y-4">
        {batches.length ? batches.map((batch) => {
          const stats = calculateBatchStats(batch);
          return (
            <article key={batch.id} className="rounded-[8px] border border-black/8 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{batch.adminApproved ? "已公开" : "未公开"}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-ink">{batch.title}</h2>
                  <p className="mt-1 text-sm text-ink/52">{batch.organizerName} / 作品 {stats.workCount} / 入选 {stats.selectedWorkCount} / 服务商 {stats.providerCount} / 确认服务商 {stats.confirmedProviderCount}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/45">缺失资源：{stats.missingItems.join("、") || "较完整"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/admin/batches/${batch.id}`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">管理详情</Link>
                  {batch.adminApproved ? <Link href={`/batches/${batch.slug}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">公开页</Link> : null}
                </div>
              </div>
              <details className="mt-4 rounded-[8px] bg-paper p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">快速编辑</summary>
                <div className="mt-3">
                  <BatchForm schools={schools} challenges={challenges} batch={batch} />
                </div>
              </details>
            </article>
          );
        }) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无批次。</div>}
      </section>
    </div>
  );
}
