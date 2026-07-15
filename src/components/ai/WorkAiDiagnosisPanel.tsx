"use client";

import { useState } from "react";
import Link from "next/link";

export type WorkAiDiagnosisView = {
  id: string;
  status: string;
  version: number;
  reviewStatus: string;
  designSummary?: string | null;
  designHighlights?: string | null;
  targetAudience?: string | null;
  suitableScenes?: string | null;
  suggestedCategories?: string | null;
  suggestedMaterials?: string | null;
  suggestedTechniques?: string | null;
  productionRisks?: string | null;
  missingInformation?: string | null;
  nextStepSuggestions?: string | null;
  professionalAssessment?: string | null;
  productionAssessment?: string | null;
  marketAssessment?: string | null;
  confidence?: number | null;
  errorMessage?: string | null;
  createdAt: string;
};

type WorkAiDiagnosisPanelProps = {
  workId: string;
  diagnoses: WorkAiDiagnosisView[];
  canRequest: boolean;
  isConfigured: boolean;
  showInternal?: boolean;
  compact?: boolean;
};

type RequestButtonProps = {
  workId: string;
  label?: string;
  disabled?: boolean;
  onDone?: (diagnosis: WorkAiDiagnosisView) => void;
};

const statusLabels: Record<string, string> = {
  PENDING: "待生成",
  PROCESSING: "生成中",
  COMPLETED: "已完成",
  FAILED: "生成失败"
};

const reviewLabels: Record<string, string> = {
  UNREVIEWED: "待管理员审核",
  APPROVED: "已通过",
  NEEDS_REVISION: "需调整",
  REJECTED: "已拒绝"
};

function toList(value?: string | null) {
  return value?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [];
}

function firstItem(value?: string | null) {
  return toList(value)[0] ?? value ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function FieldList({ title, value }: { title: string; value?: string | null }) {
  const items = toList(value);
  if (!items.length) return null;

  return (
    <div className="rounded-[8px] bg-paper p-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/60">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-[8px] bg-paper p-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/60">{value}</p>
    </div>
  );
}

export function WorkAiDiagnosisRequestButton({ workId, label = "生成 AI 诊断", disabled = false, onDone }: RequestButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const requestDiagnosis = async () => {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/works/${workId}/ai-diagnosis`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setMessage(data?.message ?? "AI 服务暂时不可用，请稍后再试。");
      return;
    }

    if (data?.diagnosis) {
      onDone?.({
        ...data.diagnosis,
        createdAt: data.diagnosis.createdAt ?? new Date().toISOString()
      });
    }
    setMessage(data?.message ?? "AI 诊断已生成。");
  };

  return (
    <div>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={requestDiagnosis}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {busy ? "生成中..." : label}
      </button>
      {message ? <p className="mt-2 text-xs leading-5 text-ink/55">{message}</p> : null}
    </div>
  );
}

export function WorkAiDiagnosisPanel({ workId, diagnoses, canRequest, isConfigured, showInternal = false, compact = false }: WorkAiDiagnosisPanelProps) {
  const [items, setItems] = useState(diagnoses);
  const latest = items[0];
  const publicSummary = latest
    ? [
        { title: "作品最大亮点", value: firstItem(latest.designHighlights) || latest.designSummary },
        { title: "最需要解决的问题", value: firstItem(latest.missingInformation) || firstItem(latest.productionRisks) },
        { title: "推荐的下一步", value: firstItem(latest.nextStepSuggestions) }
      ].filter((item) => item.value)
    : [];

  return (
    <section className={`rounded-[8px] border border-black/8 bg-white ${compact ? "p-4" : "p-5 shadow-[0_18px_50px_rgba(16,16,16,0.08)]"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">AI Diagnosis</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">AI 孵化诊断</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">AI 生成，仅供参考，不能替代老师、面料专家、版师、工厂或买手的专业判断。</p>
        </div>
        {canRequest ? (
          isConfigured ? (
            <WorkAiDiagnosisRequestButton
              workId={workId}
              label={latest ? "重新诊断" : "生成 AI 诊断"}
              onDone={(diagnosis) => setItems((current) => [diagnosis, ...current])}
            />
          ) : (
            <p className="rounded-[6px] bg-paper px-4 py-3 text-sm font-semibold text-ink/58">AI 诊断服务暂未配置，请联系管理员。</p>
          )
        ) : null}
      </div>

      {!latest ? (
        <div className="mt-4 rounded-[8px] bg-paper p-4 text-sm text-ink/55">待生成。设计师或管理员可以主动生成 AI 诊断。</div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-ink px-3 py-1 text-white">{statusLabels[latest.status] ?? latest.status}</span>
            <span className="rounded-full bg-paper px-3 py-1 text-ink/55">{reviewLabels[latest.reviewStatus] ?? latest.reviewStatus}</span>
            <span className="rounded-full bg-paper px-3 py-1 text-ink/55">v{latest.version}</span>
            <span className="rounded-full bg-paper px-3 py-1 text-ink/55">{formatDate(latest.createdAt)}</span>
            {showInternal && typeof latest.confidence === "number" ? <span className="rounded-full bg-paper px-3 py-1 text-ink/55">可信度 {latest.confidence}</span> : null}
          </div>

          {latest.status === "FAILED" && showInternal ? (
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{latest.errorMessage ?? "AI 服务暂时不可用，请稍后再试。"}</div>
          ) : null}

          {showInternal ? (
            <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
              <TextBlock title="设计概述" value={latest.designSummary} />
              <FieldList title="设计亮点" value={latest.designHighlights} />
              <FieldList title="目标人群" value={latest.targetAudience} />
              <FieldList title="适合场景" value={latest.suitableScenes} />
              <FieldList title="建议品类" value={latest.suggestedCategories} />
              <FieldList title="建议面料" value={latest.suggestedMaterials} />
              <FieldList title="建议工艺" value={latest.suggestedTechniques} />
              <FieldList title="生产风险" value={latest.productionRisks} />
              <FieldList title="缺失资料" value={latest.missingInformation} />
              <FieldList title="下一步建议" value={latest.nextStepSuggestions} />
              <TextBlock title="专业判断" value={latest.professionalAssessment} />
              <TextBlock title="生产判断" value={latest.productionAssessment} />
              <TextBlock title="市场判断" value={latest.marketAssessment} />
            </div>
          ) : latest.reviewStatus === "APPROVED" && latest.status === "COMPLETED" ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {publicSummary.map((item) => (
                  <div key={item.title} className="rounded-[8px] bg-paper p-4">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/me" className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">补充作品资料</Link>
                <Link href="/fabrics" className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">寻找适合的面料</Link>
                <Link href="/providers?type=SAMPLE_STUDIO" className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white">寻找打样工作室</Link>
              </div>
              <details className="rounded-[8px] bg-paper p-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">查看完整诊断</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <TextBlock title="设计概述" value={latest.designSummary} />
                  <FieldList title="设计亮点" value={latest.designHighlights} />
                  <FieldList title="目标人群" value={latest.targetAudience} />
                  <FieldList title="适合场景" value={latest.suitableScenes} />
                  <FieldList title="建议面料" value={latest.suggestedMaterials} />
                  <FieldList title="建议工艺" value={latest.suggestedTechniques} />
                  <FieldList title="生产风险" value={latest.productionRisks} />
                  <FieldList title="下一步建议" value={latest.nextStepSuggestions} />
                </div>
              </details>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
