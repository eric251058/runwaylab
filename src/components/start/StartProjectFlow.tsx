"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StartSourceType = "DESIGN" | "IDEA" | "NEED" | "AUDIENCE" | "STORE" | "BRAND";
type StartCategory = "DRESS" | "TOP" | "SHIRT" | "TSHIRT" | "HOODIE" | "SKIRT" | "PANTS" | "SET" | "OUTERWEAR" | "SUIT" | "KNIT" | "DENIM" | "SPORTSWEAR" | "SWIMWEAR" | "LINGERIE" | "CHILDRENSWEAR" | "LIGHT_FORMAL" | "FORMALWEAR" | "ACCESSORY" | "OTHER";
type StartPrimaryNeed = "DESIGN_DIRECTION" | "FABRIC" | "SAMPLE" | "PRODUCTION" | "MARKET_VALIDATION" | "UNSURE";
type DemandMode = "PERSONAL_CUSTOM" | "PUBLIC_COCREATION";
type UseScenario = "DAILY_COMMUTE" | "WEEKEND" | "DATE_PARTY" | "FORMAL" | "TRAVEL" | "STAGE_PHOTO" | "STORE_SALES" | "OTHER" | "UNSURE";
type PriceBand = "UNDER_299" | "FROM_300_TO_599" | "FROM_600_TO_999" | "FROM_1000_TO_1999" | "FROM_2000" | "UNSURE";
type LaunchTiming = "WITHIN_30_DAYS" | "ONE_TO_THREE_MONTHS" | "THREE_TO_SIX_MONTHS" | "EXPLORING";

type Draft = {
  version: 1;
  expiresAt: number;
  clientDraftId: string;
  step: number;
  sourceType: StartSourceType | "";
  linkedWorkId: string;
  category: StartCategory | "";
  categoryOther: string;
  primaryNeed: StartPrimaryNeed | "";
  ideaText: string;
  demandMode: DemandMode;
  useScenario: UseScenario | "";
  expectedPriceBand: PriceBand | "";
  launchTiming: LaunchTiming | "";
};

type StartProjectFlowProps = {
  initialSource: StartSourceType | null;
  isLoggedIn: boolean;
  availableWorks: Array<{
    id: string;
    title: string;
    reviewStatus: string;
    images: Array<{ imageUrl: string }>;
  }>;
};

const draftKey = "runwaylab.startProject.v1";
const draftTtlMs = 1000 * 60 * 60 * 24 * 7;

const sourceOptions: Array<{ value: StartSourceType; label: string; description: string }> = [
  { value: "DESIGN", label: "选择已有作品", description: "从设计稿、效果图或已发布作品继续推进。" },
  { value: "IDEA", label: "创建产品想法", description: "还没有完整设计也没关系，先记录产品方向。" }
  ,{ value: "NEED", label: "我想要一件衣服", description: "从真实穿着场景出发，由设计、面料和打样服务商依次响应。" }
];

const categoryOptions: Array<{ value: StartCategory; label: string }> = [
  { value: "DRESS", label: "连衣裙" },
  { value: "TOP", label: "上衣" },
  { value: "SHIRT", label: "衬衫" },
  { value: "OUTERWEAR", label: "外套" },
  { value: "SET", label: "套装" },
  { value: "SKIRT", label: "半身裙" },
  { value: "PANTS", label: "裤装" },
  { value: "LIGHT_FORMAL", label: "轻礼服" },
  { value: "KNIT", label: "针织" },
  { value: "DENIM", label: "牛仔" },
  { value: "SPORTSWEAR", label: "运动服" },
  { value: "SWIMWEAR", label: "泳装" },
  { value: "SUIT", label: "西装" },
  { value: "CHILDRENSWEAR", label: "童装" },
  { value: "ACCESSORY", label: "配饰" },
  { value: "OTHER", label: "其他" }
];

const scenarioOptions = [
  ["DAILY_COMMUTE", "日常通勤"], ["WEEKEND", "周末休闲"], ["DATE_PARTY", "聚会约会"],
  ["FORMAL", "正式场合"], ["TRAVEL", "旅行度假"], ["STAGE_PHOTO", "舞台或拍摄"],
  ["STORE_SALES", "店铺销售"], ["OTHER", "其他"], ["UNSURE", "还不确定"]
] as const;

const priceOptions = [
  ["UNDER_299", "299元以内"], ["FROM_300_TO_599", "300-599元"], ["FROM_600_TO_999", "600-999元"],
  ["FROM_1000_TO_1999", "1000-1999元"], ["FROM_2000", "2000元以上"], ["UNSURE", "还不确定"]
] as const;

const timingOptions = [
  ["WITHIN_30_DAYS", "30天内"], ["ONE_TO_THREE_MONTHS", "1-3个月"],
  ["THREE_TO_SIX_MONTHS", "3-6个月"], ["EXPLORING", "还在探索"]
] as const;

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
    linkedWorkId: "",
    category: "",
    categoryOther: "",
    primaryNeed: "",
    ideaText: "",
    demandMode: "PERSONAL_CUSTOM",
    useScenario: "",
    expectedPriceBand: "",
    launchTiming: ""
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

    const storedSource = parsed.sourceType === "DESIGN" || parsed.sourceType === "IDEA" || parsed.sourceType === "NEED" ? parsed.sourceType : "";
    return {
      ...fallback,
      ...parsed,
      clientDraftId: parsed.clientDraftId || fallback.clientDraftId,
      sourceType: initialSource ?? storedSource,
      step: storedSource || initialSource ? Math.min(Math.max(Number(parsed.step ?? 0), 0), 5) : 0
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
  if (step === 3) return "这个需求怎样推进？";
  if (step === 4) return "补充场景、预算和时间";
  return "描述你真正想要的衣服";
}

function optionClass(active: boolean) {
  return `min-h-14 rounded-[8px] border p-4 text-left transition ${
    active ? "border-ink bg-ink text-white" : "border-black/8 bg-white text-ink hover:border-ink/30"
  }`;
}

export function StartProjectFlow({ initialSource, isLoggedIn, availableWorks }: StartProjectFlowProps) {
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
    if (draft.step === 0) return draft.sourceType === "DESIGN" ? availableWorks.some((work) => work.id === draft.linkedWorkId) : Boolean(draft.sourceType);
    if (draft.step === 1) return Boolean(draft.category);
    if (draft.step === 2) return Boolean(draft.primaryNeed);
    if (draft.step === 3) return Boolean(draft.demandMode);
    if (draft.step === 4) return Boolean(draft.useScenario && draft.expectedPriceBand && draft.launchTiming);
    return true;
  }, [availableWorks, draft.category, draft.linkedWorkId, draft.primaryNeed, draft.sourceType, draft.step]);

  function updateDraft(next: Partial<Draft>) {
    setMessage("");
    setDraft((current) => ({ ...current, ...next }));
  }

  function nextStep() {
    if (!canContinue) return;
    updateDraft({ step: Math.min(draft.step + 1, 5) });
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
        linkedWorkId: draft.sourceType === "DESIGN" ? draft.linkedWorkId : null,
        category: draft.category,
        categoryOther: draft.category === "OTHER" ? draft.categoryOther : null,
        primaryNeed: draft.primaryNeed,
        ideaText: draft.ideaText
        ,demandMode: draft.demandMode,
        useScenario: draft.useScenario || null,
        expectedPriceBand: draft.expectedPriceBand || null,
        launchTiming: draft.launchTiming || null
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
          <span className="text-sm font-semibold text-ink/45">{draft.step + 1} / 6</span>
          <span className="text-xs font-semibold text-ink/35">约 2 分钟</span>
        </div>

        <h1 className="text-3xl font-semibold leading-tight text-ink md:text-4xl">{stepTitle(draft.step)}</h1>

        {draft.step === 0 ? (
          <div className="mt-6 grid gap-3">
            {sourceOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => updateDraft({ sourceType: option.value, linkedWorkId: option.value === "DESIGN" ? draft.linkedWorkId : "" })} className={optionClass(draft.sourceType === option.value)}>
                <span className="block text-base font-semibold">{option.label}</span>
                <span className={`mt-1 block text-sm leading-6 ${draft.sourceType === option.value ? "text-white/68" : "text-ink/52"}`}>{option.description}</span>
              </button>
            ))}
            {draft.sourceType === "DESIGN" ? (
              <div className="mt-2 rounded-[8px] border border-black/8 bg-paper p-4">
                <p className="text-sm font-semibold text-ink">选择要继续推进的作品</p>
                {availableWorks.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {availableWorks.map((work) => {
                      const active = draft.linkedWorkId === work.id;
                      return (
                        <button key={work.id} type="button" onClick={() => updateDraft({ linkedWorkId: work.id })} className={`flex items-center gap-3 rounded-[7px] border p-3 text-left transition ${active ? "border-ink bg-white ring-1 ring-ink" : "border-black/8 bg-white hover:border-ink/25"}`}>
                          {work.images[0]?.imageUrl ? <img src={work.images[0].imageUrl} alt="" className="size-14 shrink-0 rounded-[5px] object-cover" /> : <span className="flex size-14 shrink-0 items-center justify-center rounded-[5px] bg-black/[.04] text-xs text-ink/35">暂无图</span>}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{work.title}</span>
                            <span className="mt-1 block text-xs text-ink/45">{work.reviewStatus === "PENDING" ? "审核中" : "可继续推进"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 text-sm leading-6 text-ink/58">
                    {isLoggedIn ? <p>当前账号还没有可用作品。你可以先发布作品，或改从产品想法开始。</p> : <p>登录后即可选择你已经提交的作品。</p>}
                    <a href={isLoggedIn ? "/publish" : `/login?next=${encodeURIComponent("/start?source=design")}`} className="mt-2 inline-flex font-semibold text-ink underline underline-offset-4">{isLoggedIn ? "先发布作品" : "登录并选择作品"}</a>
                  </div>
                )}
              </div>
            ) : null}
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
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={() => updateDraft({ demandMode: "PERSONAL_CUSTOM" })} className={optionClass(draft.demandMode === "PERSONAL_CUSTOM")}>
              <span className="block text-base font-semibold">个人定制</span><span className="mt-1 block text-sm opacity-70">为自己完成一件衣服，承担设计和打样成本。</span>
            </button>
            <button type="button" onClick={() => updateDraft({ demandMode: "PUBLIC_COCREATION" })} className={optionClass(draft.demandMode === "PUBLIC_COCREATION")}>
              <span className="block text-base font-semibold">公开共创</span><span className="mt-1 block text-sm opacity-70">允许社区表达购买意向，达到门槛后再进入小批量生产。</span>
            </button>
          </div>
        ) : null}

        {draft.step === 4 ? (
          <div className="mt-6 grid gap-5">
            <div><p className="mb-2 text-xs font-semibold text-ink/45">穿着场景</p><div className="grid grid-cols-2 gap-2">{scenarioOptions.map(([value,label]) => <button key={value} type="button" onClick={() => updateDraft({ useScenario: value })} className={optionClass(draft.useScenario === value)}>{label}</button>)}</div></div>
            <div><p className="mb-2 text-xs font-semibold text-ink/45">成衣预算</p><div className="grid grid-cols-2 gap-2">{priceOptions.map(([value,label]) => <button key={value} type="button" onClick={() => updateDraft({ expectedPriceBand: value })} className={optionClass(draft.expectedPriceBand === value)}>{label}</button>)}</div></div>
            <div><p className="mb-2 text-xs font-semibold text-ink/45">希望完成时间</p><div className="grid grid-cols-2 gap-2">{timingOptions.map(([value,label]) => <button key={value} type="button" onClick={() => updateDraft({ launchTiming: value })} className={optionClass(draft.launchTiming === value)}>{label}</button>)}</div></div>
          </div>
        ) : null}

        {draft.step === 5 ? (
          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">具体需求，可稍后补充图片</span>
              <textarea value={draft.ideaText} onChange={(event) => updateDraft({ ideaText: event.target.value.slice(0, 500) })} className="mt-2 min-h-40 w-full rounded-[8px] border border-black/10 bg-paper px-4 py-3 text-base leading-7 outline-none focus:border-ink focus:bg-white" placeholder="例如：去海边度假穿的长裙，希望显瘦、飘逸、拍照好看，同时不透且不易皱。" />
              <span className="mt-2 block text-xs text-ink/40">{draft.ideaText.length} / 500</span>
            </label>
            <div className="rounded-[8px] border border-black/8 bg-paper p-4 text-sm leading-6 text-ink/55">
              下一步会保存这份启动资料，并带你继续补充目标用户与开发预算。完成最终确认后，公开共创项目才会出现在项目市场。
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
          <button type="button" disabled={!canContinue || submitting} onClick={draft.step === 5 ? createProject : nextStep} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:col-start-2">
            {submitting ? "保存中..." : draft.step === 5 ? "保存并继续完善" : "继续"}
          </button>
        </div>
      </div>
    </section>
  );
}
