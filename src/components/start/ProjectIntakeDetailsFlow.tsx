"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type IntakeStatus = "DRAFT" | "READY_FOR_REVIEW" | "SUBMITTED" | "NEEDS_INFO" | "ACCEPTED" | "DECLINED";
type EventType = "CREATED" | "DETAILS_UPDATED" | "SUBMITTED" | "WITHDRAWN" | "NEEDS_INFO" | "RESUBMITTED" | "ACCEPTED" | "DECLINED";

type EventDto = {
  id: string;
  eventType: EventType;
  note: string | null;
  createdAt: string;
  actor: {
    nickname: string;
    role: string;
  } | null;
};

export type ProjectIntakeDetailsDto = {
  id: string;
  title: string;
  ownerId: string;
  sourceType: string;
  category: string;
  categoryOther: string | null;
  primaryNeed: string;
  ideaText: string | null;
  projectTitle: string | null;
  targetAudience: string | null;
  useScenario: string | null;
  expectedPriceBand: string | null;
  launchTiming: string | null;
  reviewMessage: string | null;
  reviewNote: string | null;
  status: IntakeStatus;
  completion: number;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  nextAction: {
    label: string;
    description: string;
  };
  events: EventDto[];
};

type ProjectIntakeDetailsFlowProps = {
  initialIntake: ProjectIntakeDetailsDto;
};

const statusLabels: Record<IntakeStatus, string> = {
  DRAFT: "启动草稿",
  READY_FOR_REVIEW: "可以提交评估",
  SUBMITTED: "等待平台评估",
  NEEDS_INFO: "需要补充资料",
  ACCEPTED: "已通过评估",
  DECLINED: "暂不适合推进"
};

const eventLabels: Record<EventType, string> = {
  CREATED: "项目已启动",
  DETAILS_UPDATED: "项目资料已更新",
  SUBMITTED: "已提交平台评估",
  WITHDRAWN: "已撤回评估",
  NEEDS_INFO: "平台希望补充资料",
  RESUBMITTED: "已重新提交评估",
  ACCEPTED: "项目已通过评估",
  DECLINED: "项目暂不适合推进"
};

const sourceLabels: Record<string, string> = {
  DESIGN: "我有设计作品",
  IDEA: "我有产品想法",
  AUDIENCE: "我有粉丝或客户",
  STORE: "我有服装店",
  BRAND: "我已经有品牌"
};

const categoryLabels: Record<string, string> = {
  DRESS: "连衣裙",
  SHIRT: "衬衫",
  OUTERWEAR: "外套",
  SET: "套装",
  SKIRT: "半身裙",
  PANTS: "裤装",
  LIGHT_FORMAL: "轻礼服",
  KNIT: "针织",
  OTHER: "其他"
};

const needLabels: Record<string, string> = {
  DESIGN_DIRECTION: "找设计方向",
  FABRIC: "找面料",
  SAMPLE: "做样衣",
  PRODUCTION: "找小单生产",
  MARKET_VALIDATION: "验证市场",
  UNSURE: "我还不确定"
};

const scenarioOptions = [
  ["DAILY_COMMUTE", "日常通勤"],
  ["WEEKEND", "周末休闲"],
  ["DATE_PARTY", "聚会约会"],
  ["FORMAL", "正式场合"],
  ["TRAVEL", "旅行度假"],
  ["STAGE_PHOTO", "舞台或拍摄"],
  ["STORE_SALES", "店铺销售"],
  ["OTHER", "其他"],
  ["UNSURE", "目前还不确定"]
] as const;

const priceOptions = [
  ["UNDER_299", "299元以内"],
  ["FROM_300_TO_599", "300-599元"],
  ["FROM_600_TO_999", "600-999元"],
  ["FROM_1000_TO_1999", "1000-1999元"],
  ["FROM_2000", "2000元以上"],
  ["UNSURE", "目前还不确定"]
] as const;

const timingOptions = [
  ["WITHIN_30_DAYS", "30天内"],
  ["ONE_TO_THREE_MONTHS", "1-3个月"],
  ["THREE_TO_SIX_MONTHS", "3-6个月"],
  ["EXPLORING", "还在探索"]
] as const;

function formatDate(value?: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function optionLabel(options: readonly (readonly [string, string])[], value?: string | null) {
  return options.find(([key]) => key === value)?.[1] ?? "未填写";
}

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function summaryItem(label: string, value: string | null | undefined) {
  return (
    <div className="rounded-[8px] bg-paper p-4">
      <p className="text-xs font-semibold text-ink/40">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-ink">{value?.trim() || "未填写"}</p>
    </div>
  );
}

export function ProjectIntakeDetailsFlow({ initialIntake }: ProjectIntakeDetailsFlowProps) {
  const router = useRouter();
  const [intake, setIntake] = useState(initialIntake);
  const [step, setStep] = useState<"overview" | "audience" | "plan" | "review">("overview");
  const [projectTitle, setProjectTitle] = useState(initialIntake.projectTitle ?? "");
  const [ideaText, setIdeaText] = useState(initialIntake.ideaText ?? "");
  const [targetAudience, setTargetAudience] = useState(initialIntake.targetAudience ?? "");
  const [useScenario, setUseScenario] = useState(initialIntake.useScenario ?? "");
  const [expectedPriceBand, setExpectedPriceBand] = useState(initialIntake.expectedPriceBand ?? "");
  const [launchTiming, setLaunchTiming] = useState(initialIntake.launchTiming ?? "");
  const [reviewMessage, setReviewMessage] = useState(initialIntake.reviewMessage ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const canSaveAudience = compact(ideaText).length > 0 && compact(targetAudience).length >= 2 && Boolean(useScenario);
  const canSavePlan = Boolean(expectedPriceBand && launchTiming);
  const canSubmit = intake.completion === 100 && (intake.status === "READY_FOR_REVIEW" || intake.status === "NEEDS_INFO");
  const isLocked = intake.status === "SUBMITTED" || intake.status === "ACCEPTED" || intake.status === "DECLINED";

  const reviewNote = useMemo(() => {
    if (intake.status === "NEEDS_INFO" || intake.status === "DECLINED" || intake.status === "ACCEPTED") return intake.reviewNote;
    return null;
  }, [intake.reviewNote, intake.status]);

  function applyServerIntake(next: ProjectIntakeDetailsDto) {
    setIntake(next);
    setProjectTitle(next.projectTitle ?? "");
    setIdeaText(next.ideaText ?? "");
    setTargetAudience(next.targetAudience ?? "");
    setUseScenario(next.useScenario ?? "");
    setExpectedPriceBand(next.expectedPriceBand ?? "");
    setLaunchTiming(next.launchTiming ?? "");
    setReviewMessage(next.reviewMessage ?? "");
  }

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    const data = (await response.json().catch(() => null)) as { message?: string; loginUrl?: string; intake?: ProjectIntakeDetailsDto } | null;
    if (response.status === 401) {
      router.push(data?.loginUrl ?? `/login?next=/me/start-projects/${intake.id}`);
      return null;
    }
    if (!response.ok) {
      setMessage(data?.message ?? "操作没有完成，请稍后再试。");
      return null;
    }
    return data;
  }

  async function saveDetails(body: Record<string, unknown>, nextStep?: typeof step) {
    if (submitting || isLocked) return false;
    setSubmitting(true);
    setMessage("");
    const data = await requestJson(`/api/start-projects/${intake.id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
    setSubmitting(false);
    if (!data?.intake) return false;
    applyServerIntake(data.intake);
    setMessage("项目资料已保存。");
    if (nextStep) setStep(nextStep);
    router.refresh();
    return true;
  }

  async function submitReview() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setMessage("");

    if (reviewMessage !== (intake.reviewMessage ?? "")) {
      const saved = await requestJson(`/api/start-projects/${intake.id}`, {
        method: "PATCH",
        body: JSON.stringify({ reviewMessage })
      });
      if (!saved?.intake) {
        setSubmitting(false);
        return;
      }
      applyServerIntake(saved.intake);
    }

    const data = await requestJson(`/api/start-projects/${intake.id}/submit`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setSubmitting(false);
    setConfirmSubmit(false);
    if (!data?.intake) return;
    applyServerIntake(data.intake);
    setMessage("项目已提交评估。");
    setStep("overview");
    router.refresh();
  }

  async function withdrawReview() {
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    const data = await requestJson(`/api/start-projects/${intake.id}/withdraw`, {
      method: "POST",
      body: JSON.stringify({})
    });
    setSubmitting(false);
    setConfirmWithdraw(false);
    if (!data?.intake) return;
    applyServerIntake(data.intake);
    setMessage("已撤回评估，可以继续修改资料。");
    setStep("overview");
    router.refresh();
  }

  const primaryAction =
    intake.status === "SUBMITTED"
      ? { label: "查看当前资料", action: () => setStep("review") }
      : intake.status === "ACCEPTED"
        ? { label: "查看平台建议", action: () => setStep("review") }
        : intake.status === "DECLINED"
          ? { label: "开始一个新项目", action: () => router.push("/start") }
          : canSubmit
            ? { label: intake.status === "NEEDS_INFO" ? "重新提交评估" : "提交平台评估", action: () => setStep("review") }
            : { label: "补充项目资料", action: () => setStep("audience") };

  return (
    <div className="grid gap-5">
      <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{statusLabels[intake.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">完成度 {intake.completion}%</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink md:text-5xl">{intake.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">{intake.nextAction.description}</p>
        {reviewNote ? <p className="mt-4 rounded-[8px] bg-paper p-4 text-sm leading-7 text-ink/68">平台反馈：{reviewNote}</p> : null}
        {message ? <p className="mt-4 rounded-[8px] border border-black/8 bg-white px-4 py-3 text-sm text-ink/62">{message}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={primaryAction.action} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white">
            {primaryAction.label}
          </button>
          {intake.status === "SUBMITTED" ? (
            <button type="button" onClick={() => setConfirmWithdraw(true)} className="min-h-12 rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">
              撤回并修改
            </button>
          ) : null}
        </div>
      </section>

      {step === "overview" ? (
        <>
          <section className="grid gap-3 md:grid-cols-2">
            {summaryItem("项目来源", sourceLabels[intake.sourceType] ?? "启动项目")}
            {summaryItem("产品品类", intake.category === "OTHER" ? intake.categoryOther ?? "其他" : categoryLabels[intake.category])}
            {summaryItem("当前需求", needLabels[intake.primaryNeed])}
            {summaryItem("一句话想法", intake.ideaText)}
            {summaryItem("目标用户", intake.targetAudience)}
            {summaryItem("使用场景", optionLabel(scenarioOptions, intake.useScenario))}
            {summaryItem("价格范围", optionLabel(priceOptions, intake.expectedPriceBand))}
            {summaryItem("启动时间", optionLabel(timingOptions, intake.launchTiming))}
          </section>

          <section className="rounded-[8px] border border-black/8 bg-white p-5">
            <h2 className="text-xl font-semibold text-ink">项目时间线</h2>
            <div className="mt-4 space-y-3">
              {intake.events.length ? (
                intake.events.map((event) => (
                  <div key={event.id} className="rounded-[8px] bg-paper p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-ink">{eventLabels[event.eventType]}</p>
                      <p className="text-xs font-semibold text-ink/40">{formatDate(event.createdAt)}</p>
                    </div>
                    {event.note ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/58">{event.note}</p> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[8px] bg-paper p-4 text-sm text-ink/55">项目已在 {formatDate(intake.createdAt)} 启动。</div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {step === "audience" ? (
        <section className="rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
          <h2 className="text-2xl font-semibold text-ink">这件产品主要为谁而做？</h2>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-ink/58">项目名称</span>
              <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value.slice(0, 50))} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none focus:border-ink focus:bg-white" placeholder={intake.title} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink/58">一句话想法</span>
              <textarea value={ideaText} onChange={(event) => setIdeaText(event.target.value.slice(0, 180))} className="mt-2 min-h-28 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white" placeholder="例如：想做一条适合通勤和周末穿的轻薄连衣裙。" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink/58">目标用户</span>
              <textarea value={targetAudience} onChange={(event) => setTargetAudience(event.target.value.slice(0, 120))} className="mt-2 min-h-28 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white" placeholder="例如：刚工作不久、希望衣服舒服但有设计感的女生。也可以写：目前还不确定。" />
            </label>
            <div>
              <p className="text-sm font-semibold text-ink/58">主要穿着场景</p>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {scenarioOptions.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setUseScenario(value)} className={`min-h-11 rounded-[6px] border px-3 text-sm font-semibold ${useScenario === value ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={!canSaveAudience || submitting} onClick={() => saveDetails({ projectTitle, ideaText, targetAudience, useScenario }, "plan")} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-45">
              {submitting ? "保存中" : "保存并继续"}
            </button>
            <button type="button" onClick={() => setStep("overview")} className="min-h-12 rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">
              返回
            </button>
          </div>
        </section>
      ) : null}

      {step === "plan" ? (
        <section className="rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
          <h2 className="text-2xl font-semibold text-ink">价格和时间范围</h2>
          <div className="mt-5 grid gap-5">
            <div>
              <p className="text-sm font-semibold text-ink/58">希望最终售价大概在哪个范围？</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {priceOptions.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setExpectedPriceBand(value)} className={`min-h-11 rounded-[6px] border px-3 text-sm font-semibold ${expectedPriceBand === value ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink/58">希望什么时候开始推进？</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {timingOptions.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setLaunchTiming(value)} className={`min-h-11 rounded-[6px] border px-3 text-sm font-semibold ${launchTiming === value ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={!canSavePlan || submitting} onClick={() => saveDetails({ expectedPriceBand, launchTiming }, "review")} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-45">
              {submitting ? "保存中" : "保存并检查资料"}
            </button>
            <button type="button" onClick={() => setStep("audience")} className="min-h-12 rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">
              返回
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section className="rounded-[8px] border border-black/8 bg-white p-5 md:p-6">
          <h2 className="text-2xl font-semibold text-ink">检查项目资料</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {summaryItem("项目名称", projectTitle || intake.title)}
            {summaryItem("一句话想法", ideaText)}
            {summaryItem("目标用户", targetAudience)}
            {summaryItem("使用场景", optionLabel(scenarioOptions, useScenario))}
            {summaryItem("价格范围", optionLabel(priceOptions, expectedPriceBand))}
            {summaryItem("启动时间", optionLabel(timingOptions, launchTiming))}
          </div>
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-ink/58">还有什么希望平台了解？</span>
            <textarea value={reviewMessage} onChange={(event) => setReviewMessage(event.target.value.slice(0, 500))} className="mt-2 min-h-32 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white" placeholder="可选，不需要写商业计划书。" />
            <span className="mt-2 block text-xs text-ink/40">{reviewMessage.length} / 500</span>
          </label>
          {confirmSubmit ? (
            <div className="mt-5 rounded-[8px] border border-black/10 bg-paper p-4">
              <h3 className="font-semibold text-ink">确认提交平台评估？</h3>
              <p className="mt-2 text-sm leading-6 text-ink/58">平台会根据当前资料判断项目是否适合进入下一阶段。你可能收到“通过”“需要补充”或“暂不适合”的反馈。</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={submitting} onClick={submitReview} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-45">
                  {submitting ? "提交中" : "确认提交"}
                </button>
                <button type="button" onClick={() => setConfirmSubmit(false)} className="min-h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">
                  继续检查资料
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={!canSubmit || submitting} onClick={() => setConfirmSubmit(true)} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-45">
              {intake.status === "NEEDS_INFO" ? "重新提交评估" : "提交平台评估"}
            </button>
            <button type="button" onClick={() => setStep("plan")} className="min-h-12 rounded-full border border-black/10 px-6 text-sm font-semibold text-ink">
              返回
            </button>
          </div>
        </section>
      ) : null}

      {confirmWithdraw ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-[0_24px_70px_rgba(16,16,16,0.22)]">
            <h2 className="text-xl font-semibold text-ink">撤回并修改？</h2>
            <p className="mt-3 text-sm leading-6 text-ink/62">撤回后项目会回到可编辑状态，历史记录会保留。平台已处理后不能撤回。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmWithdraw(false)} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">取消</button>
              <button type="button" disabled={submitting} onClick={withdrawReview} className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">
                {submitting ? "处理中" : "撤回并修改"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
