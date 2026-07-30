"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StartSourceType = "DESIGN" | "IDEA" | "AUDIENCE" | "STORE" | "BRAND";
type StartCategory = "DRESS" | "SHIRT" | "OUTERWEAR" | "SET" | "SKIRT" | "PANTS" | "LIGHT_FORMAL" | "KNIT" | "OTHER";
type StartPrimaryNeed = "DESIGN_DIRECTION" | "FABRIC" | "SAMPLE" | "PRODUCTION" | "MARKET_VALIDATION" | "UNSURE";

type Draft = {
  version: 1;
  expiresAt: number;
  clientDraftId: string;
  step: number;
  sourceType: StartSourceType | "";
  category: StartCategory | "";
  categoryOther: string;
  primaryNeed: StartPrimaryNeed | "";
  ideaText: string;
};

type StartProjectFlowProps = {
  initialSource: StartSourceType | null;
  isLoggedIn: boolean;
};

const draftKey = "runwaylab.startProject.v1";
const draftTtlMs = 1000 * 60 * 60 * 24 * 7;

const sourceOptions: Array<{ value: StartSourceType; label: string; description: string }> = [
  { value: "DESIGN", label: "我有设计作品", description: "从已有作品开始，继续推进打样或合作。" },
  { value: "IDEA", label: "我有产品想法", description: "先把想法记录下来，后续再补充设计资料。" },
  { value: "AUDIENCE", label: "我有粉丝或客户", description: "围绕已有反馈整理第一件产品。" },
  { value: "STORE", label: "我有服装店", description: "从门店需求开始寻找合适产品方向。" },
  { value: "BRAND", label: "我已经有品牌", description: "为品牌补充新的产品线或样衣方向。" }
];

const categoryOptions: Array<{ value: StartCategory; label: string }> = [
  { value: "DRESS", label: "连衣裙" },
  { value: "SHIRT", label: "衬衫" },
  { value: "OUTERWEAR", label: "外套" },
  { value: "SET", label: "套装" },
  { value: "SKIRT", label: "半身裙" },
  { value: "PANTS", label: "裤装" },
  { value: "LIGHT_FORMAL", label: "轻礼服" },
  { value: "KNIT", label: "针织" },
  { value: "OTHER", label: "其他" }
];

const needOptions: Array<{ value: StartPrimaryNeed; label: string; description: string }> = [
  { value: "DESIGN_DIRECTION", label: "找设计方向", description: "先确认产品定位和风格。" },
  { value: "FABRIC", label: "找面料", description: "先梳理适合的材料方向。" },
  { value: "SAMPLE", label: "做样衣", description: "准备进入打样前的信息整理。" },
  { value: "PRODUCTION", label: "找小单生产", description: "为小批量生产做前置判断。" },
  { value: "MARKET_VALIDATION", label: "验证市场", description: "先收集真实用户反馈。" },
  { value: "UNSURE", label: "我还不确定", description: "没关系，先从项目梳理开始。" }
];

function newClientDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function emptyDraft(initialSource: StartSourceType | null): Draft {
  return {
    version: 1,
    expiresAt: Date.now() + draftTtlMs,
    clientDraftId: newClientDraftId(),
    step: 0,
    sourceType: initialSource ?? "",
    category: "",
    categoryOther: "",
    primaryNeed: "",
    ideaText: ""
  };
}

function readDraft(initialSource: StartSourceType | null): Draft {
  if (typeof window === "undefined") return emptyDraft(initialSource);
  const fallback = emptyDraft(initialSource);
  const stored = window.sessionStorage.getItem(draftKey);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored) as Partial<Draft>;
    if (parsed.version !== 1 || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(draftKey);
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
      clientDraftId: parsed.clientDraftId || fallback.clientDraftId,
      sourceType: parsed.sourceType || fallback.sourceType,
      step: Math.min(Math.max(Number(parsed.step ?? 0), 0), 3)
    };
  } catch {
    window.sessionStorage.removeItem(draftKey);
    return fallback;
  }
}

function stepTitle(step: number) {
  if (step === 0) return "你想从哪里开始？";
  if (step === 1) return "你想做什么产品？";
  if (step === 2) return "你现在最需要哪一步？";
  return "写一句话，给项目一个起点";
}

function optionClass(active: boolean) {
  return `min-h-14 rounded-[8px] border p-4 text-left transition ${
    active ? "border-ink bg-ink text-white" : "border-black/8 bg-white text-ink hover:border-ink/30"
  }`;
}

export function StartProjectFlow({ initialSource, isLoggedIn }: StartProjectFlowProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialSource));
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(readDraft(initialSource));
    setReady(true);
  }, [initialSource]);

  useEffect(() => {
    if (!ready) return;
    window.sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, expiresAt: Date.now() + draftTtlMs }));
  }, [draft, ready]);

  const canContinue = useMemo(() => {
    if (draft.step === 0) return Boolean(draft.sourceType);
    if (draft.step === 1) return Boolean(draft.category);
    if (draft.step === 2) return Boolean(draft.primaryNeed);
    return true;
  }, [draft.category, draft.primaryNeed, draft.sourceType, draft.step]);

  function updateDraft(next: Partial<Draft>) {
    setMessage("");
    setDraft((current) => ({ ...current, ...next }));
  }

  function nextStep() {
    if (!canContinue) return;
    updateDraft({ step: Math.min(draft.step + 1, 3) });
  }

  async function createProject() {
    if (submitting) return;
    setMessage("");

    if (!isLoggedIn) {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, expiresAt: Date.now() + draftTtlMs }));
      router.push(`/login?next=${encodeURIComponent("/start")}`);
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/start-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientDraftId: draft.clientDraftId,
        sourceType: draft.sourceType,
        category: draft.category,
        categoryOther: draft.category === "OTHER" ? draft.categoryOther : null,
        primaryNeed: draft.primaryNeed,
        ideaText: draft.ideaText
      })
    });

    const data = (await response.json().catch(() => null)) as { message?: string; loginUrl?: string; href?: string } | null;

    if (!response.ok) {
      setSubmitting(false);
      if (response.status === 401) {
        router.push(data?.loginUrl ?? `/login?next=${encodeURIComponent("/start")}`);
        return;
      }
      setMessage(data?.message ?? "创建失败，请稍后再试。");
      return;
    }

    window.sessionStorage.removeItem(draftKey);
    router.push(data?.href ?? "/me/projects");
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-[680px] flex-col justify-center px-4 py-6 md:px-0 md:py-12">
      <div className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_54px_rgba(16,16,16,0.07)] md:p-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-ink/45">{draft.step + 1} / 4</span>
          <span className="text-xs font-semibold text-ink/35">约 60 秒</span>
        </div>

        <h1 className="text-3xl font-semibold leading-tight text-ink md:text-4xl">{stepTitle(draft.step)}</h1>

        {draft.step === 0 ? (
          <div className="mt-6 grid gap-3">
            {sourceOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => updateDraft({ sourceType: option.value })} className={optionClass(draft.sourceType === option.value)}>
                <span className="block text-base font-semibold">{option.label}</span>
                <span className={`mt-1 block text-sm leading-6 ${draft.sourceType === option.value ? "text-white/68" : "text-ink/52"}`}>{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {draft.step === 1 ? (
          <div className="mt-6 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              {categoryOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => updateDraft({ category: option.value, categoryOther: option.value === "OTHER" ? draft.categoryOther : "" })} className={optionClass(draft.category === option.value)}>
                  <span className="block text-base font-semibold">{option.label}</span>
                </button>
              ))}
            </div>
            {draft.category === "OTHER" ? (
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">补充一句品类</span>
                <input value={draft.categoryOther} onChange={(event) => updateDraft({ categoryOther: event.target.value.slice(0, 40) })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none focus:border-ink focus:bg-white" placeholder="例如：围巾、包袋或其他服装相关产品" />
              </label>
            ) : null}
          </div>
        ) : null}

        {draft.step === 2 ? (
          <div className="mt-6 grid gap-3">
            {needOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => updateDraft({ primaryNeed: option.value })} className={optionClass(draft.primaryNeed === option.value)}>
                <span className="block text-base font-semibold">{option.label}</span>
                <span className={`mt-1 block text-sm leading-6 ${draft.primaryNeed === option.value ? "text-white/68" : "text-ink/52"}`}>{option.description}</span>
              </button>
            ))}
            {draft.primaryNeed === "UNSURE" ? <p className="rounded-[6px] bg-paper p-4 text-sm leading-6 text-ink/58">没关系，先创建项目，我们会从项目梳理开始。</p> : null}
          </div>
        ) : null}

        {draft.step === 3 ? (
          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">一句话描述，可跳过</span>
              <textarea value={draft.ideaText} onChange={(event) => updateDraft({ ideaText: event.target.value.slice(0, 180) })} className="mt-2 min-h-32 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white" placeholder="例如：想做一条适合通勤和周末穿的轻薄连衣裙。" />
              <span className="mt-2 block text-xs text-ink/40">{draft.ideaText.length} / 180</span>
            </label>
            <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm leading-6 text-ink/55">
              图片可在项目建立后补充。本轮不会把启动草稿图片写入公开 uploads。
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-5 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-[auto_1fr]">
          {draft.step > 0 ? (
            <button type="button" onClick={() => updateDraft({ step: Math.max(draft.step - 1, 0) })} className="min-h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
              返回
            </button>
          ) : null}
          <button type="button" disabled={!canContinue || submitting} onClick={draft.step === 3 ? createProject : nextStep} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:col-start-2">
            {submitting ? "创建中..." : draft.step === 3 ? "创建我的项目" : "继续"}
          </button>
        </div>
      </div>
    </section>
  );
}
