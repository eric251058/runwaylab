import Link from "next/link";
import { AiDiagnosisReviewStatus, AiDiagnosisStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminAiDiagnosesPageProps = {
  searchParams?: Promise<{
    status?: string;
    reviewStatus?: string;
    q?: string;
    failed?: string;
    lowConfidence?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  PENDING: "待生成",
  PROCESSING: "生成中",
  COMPLETED: "已完成",
  FAILED: "生成失败"
};

const reviewLabels: Record<string, string> = {
  UNREVIEWED: "待审核",
  APPROVED: "已通过",
  NEEDS_REVISION: "需调整",
  REJECTED: "已拒绝"
};

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function optionUrl(key: string, value: string) {
  const params = new URLSearchParams();
  if (value) params.set(key, value);
  return `/admin/ai-diagnoses${params.toString() ? `?${params}` : ""}`;
}

export default async function AdminAiDiagnosesPage({ searchParams }: AdminAiDiagnosesPageProps) {
  const params = await searchParams;
  const status = Object.values(AiDiagnosisStatus).includes(params?.status as AiDiagnosisStatus) ? (params?.status as AiDiagnosisStatus) : undefined;
  const reviewStatus = Object.values(AiDiagnosisReviewStatus).includes(params?.reviewStatus as AiDiagnosisReviewStatus) ? (params?.reviewStatus as AiDiagnosisReviewStatus) : undefined;
  const lowConfidence = params?.lowConfidence === "true";
  const failed = params?.failed === "true";
  const query = params?.q?.trim().toLowerCase() ?? "";

  const diagnoses = await prisma.workAiDiagnosis.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(reviewStatus ? { reviewStatus } : {}),
      ...(failed ? { status: AiDiagnosisStatus.FAILED } : {}),
      ...(lowConfidence ? { confidence: { lt: 50 } } : {})
    },
    include: {
      work: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 120
  });

  const filtered = query
    ? diagnoses.filter((item) => [item.work.title, item.work.user.nickname, item.work.user.email].some((value) => value.toLowerCase().includes(query)))
    : diagnoses;

  const counts = await Promise.all([
    prisma.workAiDiagnosis.count({ where: { status: AiDiagnosisStatus.PENDING } }),
    prisma.workAiDiagnosis.count({ where: { status: AiDiagnosisStatus.PROCESSING } }),
    prisma.workAiDiagnosis.count({ where: { status: AiDiagnosisStatus.FAILED } }),
    prisma.workAiDiagnosis.count({ where: { reviewStatus: AiDiagnosisReviewStatus.UNREVIEWED } }),
    prisma.workAiDiagnosis.count({ where: { reviewStatus: AiDiagnosisReviewStatus.APPROVED } }),
    prisma.workAiDiagnosis.count({ where: { confidence: { lt: 50 } } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-6xl">AI 作品诊断</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">查看 AI 诊断生成状态、审核结果和低置信度内容。AI 生成仅供参考，不自动修改任何业务状态。</p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["待生成", counts[0], optionUrl("status", "PENDING")],
          ["生成中", counts[1], optionUrl("status", "PROCESSING")],
          ["生成失败", counts[2], "/admin/ai-diagnoses?failed=true"],
          ["待审核", counts[3], optionUrl("reviewStatus", "UNREVIEWED")],
          ["已通过", counts[4], optionUrl("reviewStatus", "APPROVED")],
          ["低置信度", counts[5], "/admin/ai-diagnoses?lowConfidence=true"]
        ].map(([label, value, href]) => (
          <Link key={label} href={String(href)} className="rounded-[8px] border border-black/8 bg-white p-4">
            <span className="block text-xs font-semibold text-ink/45">{label}</span>
            <span className="mt-2 block text-3xl font-semibold text-ink">{value}</span>
          </Link>
        ))}
      </section>

      <form className="mb-6 grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[1fr_160px_160px_120px]">
        <input name="q" defaultValue={params?.q ?? ""} placeholder="搜索作品、设计师、邮箱" className="h-10 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none">
          <option value="">全部状态</option>
          {Object.values(AiDiagnosisStatus).map((item) => (
            <option key={item} value={item}>{statusLabels[item]}</option>
          ))}
        </select>
        <select name="reviewStatus" defaultValue={reviewStatus ?? ""} className="h-10 rounded-[6px] border border-black/10 bg-paper px-3 text-sm outline-none">
          <option value="">全部审核</option>
          {Object.values(AiDiagnosisReviewStatus).map((item) => (
            <option key={item} value={item}>{reviewLabels[item]}</option>
          ))}
        </select>
        <button className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white">筛选</button>
      </form>

      <section className="space-y-3">
        {filtered.length ? filtered.map((item) => {
          const missingCount = item.missingInformation?.split("\n").filter(Boolean).length ?? 0;
          return (
            <article key={item.id} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 lg:grid-cols-[1fr_180px_140px]">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-ink px-3 py-1 text-white">{statusLabels[item.status]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-ink/55">{reviewLabels[item.reviewStatus]}</span>
                  {typeof item.confidence === "number" ? <span className="rounded-full bg-paper px-3 py-1 text-ink/55">可信度 {item.confidence}</span> : null}
                  {missingCount ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">缺失资料 {missingCount}</span> : null}
                </div>
                <Link href={`/admin/ai-diagnoses/${item.id}`} className="mt-3 block truncate text-base font-semibold text-ink hover:text-ink/70">{item.work.title}</Link>
                <p className="mt-1 truncate text-sm text-ink/50">{item.work.user.nickname} / {item.work.user.email}</p>
              </div>
              <div className="text-sm leading-6 text-ink/52">
                <p>v{item.version} / {formatDate(item.createdAt)}</p>
                <p>{item.modelProvider ?? "模型未记录"} / {item.promptVersion ?? "prompt 未记录"}</p>
              </div>
              <Link href={`/admin/ai-diagnoses/${item.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                查看诊断
              </Link>
            </article>
          );
        }) : (
          <div className="rounded-[8px] border border-dashed border-black/15 bg-white p-10 text-center text-sm text-ink/55">当前筛选下没有 AI 诊断记录。</div>
        )}
      </section>
    </div>
  );
}
