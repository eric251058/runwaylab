"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Trash2 } from "lucide-react";
import {
  MAX_WORK_IMAGES,
  MIN_WORK_IMAGES,
  categoryOptions,
  styleTagOptions,
  type UploadedWorkImage,
  workTypeOptions
} from "@/lib/works/form-options";

const opportunityOptions = [
  { key: "participateChallenge", label: "参加新人设计挑战" },
  { key: "isOpenCoop", label: "开放合作" },
  { key: "wantsFabric", label: "需要找面料" },
  { key: "wantsSample", label: "申请打样评估" },
  { key: "acceptsCopyright", label: "接受版权合作" },
  { key: "acceptsBrandCollab", label: "接受品牌联名" },
  { key: "wantsIncubation", label: "希望进入孵化池" }
] as const;

type OpportunityKey = (typeof opportunityOptions)[number]["key"];

type WorkForm = {
  title: string;
  description: string;
  category: string;
  workType: string;
  styleTags: string[];
  isAiAssisted: boolean;
  isOriginal: boolean;
  opportunities: Record<OpportunityKey, boolean>;
};

export type PublishInitialWork = {
  id: string;
  title: string;
  description: string;
  category: string;
  workType: string;
  styleTags: string[];
  isAiAssisted: boolean;
  isOriginal: boolean;
  isOpenCoop: boolean;
  wantsFabric: boolean;
  wantsSample: boolean;
  wantsIncubation: boolean;
  images: UploadedWorkImage[];
};

const initialForm: WorkForm = {
  title: "",
  description: "",
  category: categoryOptions[0],
  workType: workTypeOptions[0],
  styleTags: [],
  isAiAssisted: false,
  isOriginal: false,
  opportunities: {
    participateChallenge: false,
    isOpenCoop: false,
    wantsFabric: false,
    wantsSample: false,
    acceptsCopyright: false,
    acceptsBrandCollab: false,
    wantsIncubation: false
  }
};

type PublishWorkFormProps = {
  initialWork?: PublishInitialWork;
};

export function PublishWorkForm({ initialWork }: PublishWorkFormProps) {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<UploadedWorkImage[]>(initialWork?.images ?? []);
  const [form, setForm] = useState<WorkForm>(
    initialWork
      ? {
          title: initialWork.title,
          description: initialWork.description,
          category: initialWork.category,
          workType: initialWork.workType,
          styleTags: initialWork.styleTags,
          isAiAssisted: initialWork.isAiAssisted,
          isOriginal: initialWork.isOriginal,
          opportunities: {
            participateChallenge: false,
            isOpenCoop: initialWork.isOpenCoop,
            wantsFabric: initialWork.wantsFabric,
            wantsSample: initialWork.wantsSample,
            acceptsCopyright: false,
            acceptsBrandCollab: false,
            wantsIncubation: initialWork.wantsIncubation
          }
        }
      : initialForm
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [createdWorkId, setCreatedWorkId] = useState<string | null>(null);

  const validationReasons = useMemo(() => {
    const reasons: string[] = [];

    if (images.length < MIN_WORK_IMAGES) {
      reasons.push(`请至少上传 ${MIN_WORK_IMAGES} 张作品图片`);
    }

    if (images.length > MAX_WORK_IMAGES) {
      reasons.push(`最多上传 ${MAX_WORK_IMAGES} 张作品图片`);
    }

    if (!form.title.trim()) {
      reasons.push("请填写作品标题");
    }

    if (!form.description.trim()) {
      reasons.push("请填写设计理念");
    }

    if (!form.category) {
      reasons.push("请选择服装品类");
    }

    if (!form.workType) {
      reasons.push("请选择作品类型");
    }

    if (form.styleTags.length === 0) {
      reasons.push("请选择至少一个风格标签");
    }

    if (!form.isOriginal) {
      reasons.push("请确认作品为本人原创或已获得授权");
    }

    return reasons;
  }, [form, images.length]);

  const canSubmit = validationReasons.length === 0;

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage("");

    if (images.length + files.length > MAX_WORK_IMAGES) {
      setMessage(`最多上传 ${MAX_WORK_IMAGES} 张作品图片。`);
      return;
    }

    setUploading(true);
    const uploaded: UploadedWorkImage[] = [];

    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMessage("图片格式仅支持 jpg、jpeg、png、webp。");
        setUploading(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setMessage("单张图片最大 10MB。");
        setUploading(false);
        return;
      }

      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", "work");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: payload
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.message ?? "图片上传失败。");
        setUploading(false);
        return;
      }

      uploaded.push(data);
    }

    setImages((current) => [...current, ...uploaded]);
    setUploading(false);
  };

  const removeImage = async (index: number) => {
    const image = images[index];
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    await fetch("/api/upload", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key: image.key, imageUrl: image.imageUrl })
    }).catch(() => undefined);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setForm((current) => ({
      ...current,
      styleTags: current.styleTags.includes(tag)
        ? current.styleTags.filter((item) => item !== tag)
        : current.styleTags.length < 5
          ? [...current.styleTags, tag]
          : current.styleTags
    }));
  };

  const submit = async () => {
    if (!canSubmit) {
      setMessage(validationReasons[0] ?? "请补全作品信息后再提交。");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const response = await fetch(initialWork ? `/api/works/${initialWork.id}` : "/api/works", {
      method: initialWork ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
        workType: form.workType,
        styleTags: form.styleTags,
        isAiAssisted: form.isAiAssisted,
        isOriginal: form.isOriginal,
        images,
        ...form.opportunities
      })
    });
    const data = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data?.message ?? "作品提交失败。");
      return;
    }

    setCreatedWorkId(data.work.id);
    setStep(4);
  };

  if (step === 4) {
    return (
      <div className="mx-auto flex min-h-[75dvh] max-w-3xl flex-col justify-center px-4 py-12 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-ink">
          <Check size={24} />
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-ink">{initialWork ? "你的作品已重新提交审核。" : "你的作品已提交审核。"}</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">作品审核通过后，将进入作品库、挑战页和个人主页。你也可以继续完善合作和孵化需求。</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/me" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            查看我的作品
          </Link>
          {initialWork ? (
            <Link href="/publish" className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-ink">
              继续发布作品
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setImages([]);
                setForm(initialForm);
                setCreatedWorkId(null);
                setStep(1);
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-ink"
            >
              继续发布作品
            </button>
          )}
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-ink">
            返回首页
          </Link>
        </div>
        {createdWorkId ? <p className="mt-5 text-xs text-ink/35">作品 ID：{createdWorkId}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Publish</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{initialWork ? "编辑作品" : "发布作品"}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/58">
          不需要是完整成衣。草图、效果图、AI辅助设计、毕业作品和面料实验都可以发布。
        </p>
      </header>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {["上传图片", "基础信息", "选择机会", "提交审核"].map((label, index) => (
          <div key={label} className={`rounded-[6px] px-3 py-2 text-xs font-semibold ${step === index + 1 ? "bg-ink text-white" : "bg-white text-ink/45"}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>

      <section className="rounded-[6px] bg-white p-5 shadow-[0_18px_60px_rgba(16,16,16,0.08)] md:p-7">
        {step === 1 ? (
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">上传作品图片</h2>
                <p className="mt-2 text-sm text-ink/55">上传 {MIN_WORK_IMAGES}-{MAX_WORK_IMAGES} 张，支持 jpg、jpeg、png、webp，单张最大 10MB。</p>
              </div>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white">
                <ImagePlus size={16} />
                {uploading ? "上传中..." : "选择图片"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <div key={`${image.imageUrl}-${index}`} className="overflow-hidden rounded-[6px] border border-black/10 bg-paper">
                  <img src={image.imageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="text-xs font-semibold text-ink/45">#{index + 1}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveImage(index, -1)} className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold">
                        上移
                      </button>
                      <button type="button" onClick={() => moveImage(index, 1)} className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold">
                        下移
                      </button>
                      <button type="button" onClick={() => removeImage(index)} className="rounded-full border border-black/10 px-2 py-1 text-xs text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold text-ink">填写基础信息</h2>
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">作品标题</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 outline-none focus:border-ink" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/45">设计理念</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-36 w-full rounded-[6px] border border-black/10 bg-paper p-4 outline-none focus:border-ink" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">服装品类</span>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 outline-none">
                  {categoryOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">作品类型</span>
                <select value={form.workType} onChange={(event) => setForm({ ...form, workType: event.target.value })} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 outline-none">
                  {workTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink/45">风格标签（最多 5 个）</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {styleTagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${form.styleTags.includes(tag) ? "border-ink bg-ink text-white" : "border-black/10 bg-paper text-ink/55"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-[6px] bg-paper p-4 text-sm font-semibold">
              <input type="checkbox" checked={form.isAiAssisted} onChange={(event) => setForm({ ...form, isAiAssisted: event.target.checked })} />
              是否 AI 辅助
            </label>
            <label className="flex items-center gap-3 rounded-[6px] bg-paper p-4 text-sm font-semibold">
              <input type="checkbox" checked={form.isOriginal} onChange={(event) => setForm({ ...form, isOriginal: event.target.checked })} />
              我确认该作品为本人原创或已获得授权。
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="text-2xl font-semibold text-ink">选择机会</h2>
            <p className="mt-2 text-sm text-ink/55">这些选择会写入作品状态，帮助后台判断挑战参赛、合作和孵化方向。这里的选项不是必填，不勾选也可以提交审核。</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {opportunityOptions.map((option) => (
                <label key={option.key} className="flex items-center gap-3 rounded-[6px] border border-black/8 bg-paper p-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.opportunities[option.key]}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        opportunities: {
                          ...form.opportunities,
                          [option.key]: event.target.checked
                        }
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 && validationReasons.length > 0 ? (
          <div className="mt-5 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">还不能提交，请先完成：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validationReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {message ? <p className="mt-5 rounded-[6px] bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-black/8 pt-5">
          <button type="button" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} className="inline-flex h-11 items-center gap-2 rounded-full border border-black/15 bg-white px-5 text-sm font-semibold disabled:opacity-30">
            <ArrowLeft size={15} />
            上一步
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && images.length < MIN_WORK_IMAGES) {
                  setMessage(`请至少上传 ${MIN_WORK_IMAGES} 张作品图片。`);
                  return;
                }
                setMessage("");
                setStep((current) => current + 1);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              下一步
              <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" disabled={submitting || !canSubmit} onClick={submit} className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-ink disabled:opacity-40">
              {submitting ? "提交中..." : "提交审核"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
