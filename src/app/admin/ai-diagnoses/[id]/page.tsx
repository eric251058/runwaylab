import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAiDiagnosisActions } from "@/components/admin/AdminAiDiagnosisActions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminAiDiagnosisDetailPageProps = {
  params: Promise<{
    id: string;
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
  return value.toLocaleString("zh-CN");
}

function list(value?: string | null) {
  return value?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [];
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/60">{value}</p>
    </div>
  );
}

function ListBlock({ title, value }: { title: string; value?: string | null }) {
  const items = list(value);
  if (!items.length) return null;

  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/60">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminAiDiagnosisDetailPage({ params }: AdminAiDiagnosisDetailPageProps) {
  const { id } = await params;
  const diagnosis = await prisma.workAiDiagnosis.findUnique({
    where: { id },
    include: {
      work: {
        include: {
          user: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1
          }
        }
      },
      requestedBy: true,
      reviewedBy: true
    }
  });

  if (!diagnosis) {
    notFound();
  }

  const inputSummary = [
    `作品标题：${diagnosis.work.title}`,
    `作品类型：${diagnosis.work.workType}`,
    `品类：${diagnosis.work.category}`,
    `风格标签：${diagnosis.work.styleTags.join("、") || "未填写"}`,
    `作品说明长度：${diagnosis.work.description.length} 字`
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/admin/ai-diagnoses" className="mb-5 inline-flex text-sm font-semibold text-ink/55 hover:text-ink">返回 AI 诊断列表</Link>

      <header className="mb-6 rounded-[8px] border border-black/8 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">AI Diagnosis</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{diagnosis.work.title}</h1>
        <p className="mt-3 text-sm text-ink/55">{diagnosis.work.user.nickname} / {diagnosis.work.user.email}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-ink px-3 py-1 text-white">{statusLabels[diagnosis.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-ink/55">{reviewLabels[diagnosis.reviewStatus]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-ink/55">v{diagnosis.version}</span>
          {typeof diagnosis.confidence === "number" ? <span className="rounded-full bg-paper px-3 py-1 text-ink/55">可信度 {diagnosis.confidence}</span> : null}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <main className="space-y-5">
          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">AI 输入摘要</h2>
            <div className="mt-4 grid gap-2 text-sm text-ink/58 md:grid-cols-2">
              {inputSummary.map((item) => (
                <p key={item} className="rounded-[6px] bg-paper p-3">{item}</p>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-ink/45">未发送用户密码、邮箱登录信息、Cookie、管理员备注、服务商联系方式或报价成本。</p>
          </section>

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">结构化诊断</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TextBlock title="设计概述" value={diagnosis.designSummary} />
              <ListBlock title="设计亮点" value={diagnosis.designHighlights} />
              <ListBlock title="目标人群" value={diagnosis.targetAudience} />
              <ListBlock title="适合场景" value={diagnosis.suitableScenes} />
              <ListBlock title="建议品类" value={diagnosis.suggestedCategories} />
              <ListBlock title="建议面料" value={diagnosis.suggestedMaterials} />
              <ListBlock title="建议工艺" value={diagnosis.suggestedTechniques} />
              <ListBlock title="生产风险" value={diagnosis.productionRisks} />
              <ListBlock title="缺失资料" value={diagnosis.missingInformation} />
              <ListBlock title="下一步建议" value={diagnosis.nextStepSuggestions} />
              <TextBlock title="专业判断" value={diagnosis.professionalAssessment} />
              <TextBlock title="生产判断" value={diagnosis.productionAssessment} />
              <TextBlock title="市场判断" value={diagnosis.marketAssessment} />
            </div>
          </section>

          {diagnosis.errorMessage ? (
            <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-semibold">失败信息摘要</p>
              <p className="mt-2">{diagnosis.errorMessage}</p>
            </section>
          ) : null}
        </main>

        <aside className="space-y-5">
          <div className="rounded-[8px] border border-black/8 bg-white p-4 text-sm leading-6 text-ink/58">
            <p className="font-semibold text-ink">模型信息</p>
            <p className="mt-2">Provider：{diagnosis.modelProvider ?? "未记录"}</p>
            <p>Model：{diagnosis.modelName ?? "未记录"}</p>
            <p>Prompt：{diagnosis.promptVersion ?? "未记录"}</p>
            <p>生成时间：{formatDate(diagnosis.createdAt)}</p>
            <p>申请人：{diagnosis.requestedBy?.nickname ?? "系统或未知"}</p>
            <p>审核人：{diagnosis.reviewedBy?.nickname ?? "未审核"}</p>
            {diagnosis.adminNote ? <p className="mt-2 rounded-[6px] bg-paper p-3">备注：{diagnosis.adminNote}</p> : null}
          </div>
          <AdminAiDiagnosisActions diagnosisId={diagnosis.id} />
          <Link href={`/works/${diagnosis.workId}`} className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
            查看作品详情
          </Link>
        </aside>
      </div>
    </div>
  );
}
