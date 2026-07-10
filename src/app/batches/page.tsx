import Link from "next/link";
import { IncubationBatchStatus, IncubationBatchType, type Prisma } from "@prisma/client";
import {
  BATCH_WORK_STATUS_LABELS,
  INCUBATION_BATCH_STATUS_LABELS,
  INCUBATION_BATCH_TYPE_LABELS,
  calculateBatchStats,
  publicBatchWhere,
  selectedBatchWorkStatuses
} from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BatchesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateText(value?: Date | null) {
  return value ? value.toLocaleDateString("zh-CN") : "未设置";
}

function coverStyle(index: number) {
  const labels = ["Batch", "Course", "Pilot", "Market"];
  return labels[index % labels.length];
}

export default async function BatchesPage({ searchParams }: BatchesPageProps) {
  const params = await searchParams;
  const type = firstValue(params?.type);
  const status = firstValue(params?.status);
  const city = firstValue(params?.city);
  const recruiting = firstValue(params?.recruiting);
  const school = firstValue(params?.school);

  const where: Prisma.IncubationBatchWhereInput = {
    ...publicBatchWhere(),
    ...(type && Object.values(IncubationBatchType).includes(type as IncubationBatchType) ? { type: type as IncubationBatchType } : {}),
    ...(status && Object.values(IncubationBatchStatus).includes(status as IncubationBatchStatus) ? { status: status as IncubationBatchStatus } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(school ? { schoolId: school } : {}),
    ...(recruiting === "true" ? { status: IncubationBatchStatus.RECRUITING } : {})
  };

  const [batches, schools] = await Promise.all([
    prisma.incubationBatch.findMany({
      where,
      include: {
        school: true,
        challenge: true,
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
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.school.findMany({ orderBy: { name: "asc" }, take: 80 })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Incubation Batches</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">孵化批次</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">把分散作品聚合成课程、挑战赛、选品和小单试产批次，让服务商看到更清楚的目标和推进阶段。</p>
        </div>
        <Link href="/incubation" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink sm:w-fit">查看孵化池</Link>
      </header>

      <form className="mb-6 grid gap-2 rounded-[8px] border border-black/8 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部类型</option>
          {Object.values(IncubationBatchType).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_TYPE_LABELS[value]}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部状态</option>
          {Object.values(IncubationBatchStatus).filter((value) => !["DRAFT", "CANCELLED"].includes(value)).map((value) => <option key={value} value={value}>{INCUBATION_BATCH_STATUS_LABELS[value]}</option>)}
        </select>
        <input name="city" defaultValue={city ?? ""} placeholder="城市" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="school" defaultValue={school ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">全部学校</option>
          {schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">筛选</button>
        <label className="flex items-center gap-2 text-sm text-ink/55 lg:col-span-5">
          <input name="recruiting" value="true" type="checkbox" defaultChecked={recruiting === "true"} />
          只看招募中
        </label>
      </form>

      {batches.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch, index) => {
            const stats = calculateBatchStats(batch);
            const selectedCount = selectedBatchWorkStatuses.reduce((sum, batchStatus) => sum + stats.workStatusCounts[batchStatus], 0);
            return (
              <article key={batch.id} className="overflow-hidden rounded-[8px] border border-black/8 bg-white shadow-[0_16px_48px_rgba(16,16,16,0.08)]">
                <div className="flex aspect-[16/9] items-center justify-center bg-ink text-2xl font-semibold text-white">{coverStyle(index)}</div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{INCUBATION_BATCH_TYPE_LABELS[batch.type]}</span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{INCUBATION_BATCH_STATUS_LABELS[batch.status]}</span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-xl font-semibold text-ink">{batch.title}</h2>
                  <p className="mt-2 text-sm text-ink/52">{batch.organizerName}{batch.city ? ` / ${batch.city}` : ""}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/58">{batch.summary}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-ink/52">
                    <span>作品 {stats.workCount}</span>
                    <span>入选 {selectedCount}</span>
                    <span>服务商 {stats.providerCount}</span>
                    <span>目标 {batch.targetProductionQuantity ?? "未定"}</span>
                    <span className="col-span-2">截止 {dateText(batch.submissionDeadline)}</span>
                    <span className="col-span-2">{BATCH_WORK_STATUS_LABELS.SELECTED}：{stats.selectedWorkCount}</span>
                  </div>
                  <Link href={`/batches/${batch.slug}`} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                    查看批次
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无符合条件的公开批次。</div>
      )}
    </div>
  );
}
