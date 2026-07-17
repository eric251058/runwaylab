"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PROVIDER_SERVICE_TAGS } from "@/lib/provider-experience";

type ClientProviderType = "FABRIC_SUPPLIER" | "SAMPLE_STUDIO" | "FACTORY";

type SubmitProviderApplicationFormProps = {
  initialType?: ClientProviderType | null;
};

type Draft = {
  name: string;
  services: string[];
  intro: string;
};

const draftKey = "runwaylab.provider.quickCreate.v1";

const serviceDefaults: Record<ClientProviderType, string[]> = {
  FABRIC_SUPPLIER: ["面料供应"],
  SAMPLE_STUDIO: ["服装打样"],
  FACTORY: ["小单生产"]
};

function emptyDraft(initialType?: ClientProviderType | null): Draft {
  return {
    name: "",
    services: initialType ? serviceDefaults[initialType] : [],
    intro: ""
  };
}

function readDraft(initialType?: ClientProviderType | null): Draft {
  if (typeof window === "undefined") return emptyDraft(initialType);
  const fallback = emptyDraft(initialType);
  const stored = window.localStorage.getItem(draftKey);
  if (!stored) return fallback;
  try {
    const parsed = JSON.parse(stored) as Partial<Draft>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : fallback.name,
      services:
        Array.isArray(parsed.services) && parsed.services.length
          ? parsed.services.filter((item): item is string => typeof item === "string" && (PROVIDER_SERVICE_TAGS as readonly string[]).includes(item))
          : fallback.services,
      intro: typeof parsed.intro === "string" ? parsed.intro : fallback.intro
    };
  } catch {
    return fallback;
  }
}

function fieldError(errors: Record<string, string>, name: string) {
  return errors[name] ? <p className="mt-2 text-xs font-semibold text-red-600">{errors[name]}</p> : null;
}

export function SubmitProviderApplicationForm({ initialType }: SubmitProviderApplicationFormProps) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const introRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialType));
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(readDraft(initialType));
    setReady(true);
  }, [initialType]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, ready]);

  const introCount = useMemo(() => draft.intro.trim().length, [draft.intro]);

  function updateDraft(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
    setMessage("");
  }

  function toggleService(service: string) {
    setDraft((current) => {
      const exists = current.services.includes(service);
      return {
        ...current,
        services: exists ? current.services.filter((item) => item !== service) : [...current.services, service]
      };
    });
    setErrors({});
    setMessage("");
  }

  function validate(skipProfile = false) {
    if (skipProfile) return {};
    const nextErrors: Record<string, string> = {};
    if (!draft.name.trim()) nextErrors.name = "请填写服务商名称。";
    if (!draft.services.length) nextErrors.services = "请至少选择一项服务。";
    if (draft.intro.trim().length > 120) nextErrors.intro = "一句话介绍最多 120 个字。";
    return nextErrors;
  }

  function submit(skipProfile = false) {
    setMessage("");
    const nextErrors = validate(skipProfile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        if (nextErrors.name) nameRef.current?.focus();
        else if (nextErrors.intro) introRef.current?.focus();
      });
      return;
    }

    startTransition(async () => {
      const payload = skipProfile
        ? {
            name: draft.name.trim() || undefined,
            services: draft.services,
            intro: "",
            skipProfile: true
          }
        : {
            name: draft.name.trim(),
            services: draft.services,
            intro: draft.intro.trim(),
            skipProfile: false
          };

      const response = await fetch("/api/provider/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as { message?: string; fieldErrors?: Record<string, string>; next?: string } | null;

      if (response.status === 401) {
        setMessage("登录状态失效，草稿已保留。请重新登录后继续。");
        router.push(`/login?next=${encodeURIComponent("/providers/apply")}`);
        return;
      }

      if (!response.ok) {
        setErrors(result?.fieldErrors ?? {});
        setMessage(result?.message ?? "提交失败，请稍后再试。");
        requestAnimationFrame(() => {
          if (result?.fieldErrors?.name) nameRef.current?.focus();
          else if (result?.fieldErrors?.intro) introRef.current?.focus();
        });
        return;
      }

      window.localStorage.removeItem(draftKey);
      router.push(result?.next ?? "/provider-center");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_18px_50px_rgba(16,16,16,0.06)] md:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Provider</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">创建你的服务商主页</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/58">先填写最基本的信息，其他资料可以稍后完善。</p>
      </div>

      <div className="mt-6 grid gap-5">
        {message ? <p className="rounded-[6px] bg-paper px-3 py-2 text-sm font-semibold text-ink/70">{message}</p> : null}

        <label className="block">
          <span className="text-sm font-semibold text-ink">服务商名称</span>
          <input
            ref={nameRef}
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            maxLength={100}
            placeholder="华格纺织"
            className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-base outline-none transition focus:border-ink focus:bg-white"
          />
          {fieldError(errors, "name")}
        </label>

        <div>
          <p className="text-sm font-semibold text-ink">提供的服务</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROVIDER_SERVICE_TAGS.map((service) => {
              const active = draft.services.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                    active ? "border-ink bg-ink text-white" : "border-black/10 bg-paper text-ink/60 hover:border-ink/35 hover:text-ink"
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
          {fieldError(errors, "services")}
        </div>

        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
            <span>一句话介绍</span>
            <span className={introCount > 120 ? "text-red-600" : "text-ink/35"}>{introCount}/120</span>
          </span>
          <textarea
            ref={introRef}
            value={draft.intro}
            onChange={(event) => updateDraft({ intro: event.target.value })}
            maxLength={140}
            placeholder="例如：专注女装针织面料，支持寄样和小批量采购。"
            className="mt-2 min-h-28 w-full resize-none rounded-[6px] border border-black/10 bg-paper px-4 py-3 text-base leading-6 outline-none transition focus:border-ink focus:bg-white"
          />
          {fieldError(errors, "intro")}
        </label>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={isPending}
            className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "处理中..." : "进入服务商中心"}
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={isPending}
            className="h-12 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            稍后完善
          </button>
        </div>
      </div>
    </section>
  );
}
