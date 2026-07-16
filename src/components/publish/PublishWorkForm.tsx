"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { WorkAiDiagnosisRequestButton } from "@/components/ai/WorkAiDiagnosisPanel";
import { normalizeImageUrl, visualFor } from "@/components/works/work-visuals";
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

type PublishWorkImage = UploadedWorkImage & {
  clientId?: string;
  previewUrl?: string;
  isUploading?: boolean;
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

const initialOpportunities: Record<OpportunityKey, boolean> = {
  participateChallenge: false,
  isOpenCoop: false,
  wantsFabric: false,
  wantsSample: false,
  acceptsCopyright: false,
  acceptsBrandCollab: false,
  wantsIncubation: false
};

const initialForm: WorkForm = {
  title: "",
  description: "",
  category: categoryOptions[0],
  workType: workTypeOptions[0],
  styleTags: [styleTagOptions[0]],
  isAiAssisted: false,
  isOriginal: true,
  opportunities: initialOpportunities
};

type PublishWorkFormProps = {
  initialWork?: PublishInitialWork;
};

function createClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toServerImages(images: PublishWorkImage[]): UploadedWorkImage[] {
  return images
    .map(({ imageUrl, key, filename, size, mimeType }) => ({
      imageUrl: normalizeImageUrl(imageUrl),
      key,
      filename,
      size,
      mimeType
    }))
    .filter((image) => image.imageUrl && !image.imageUrl.startsWith("blob:"));
}

export function PublishWorkForm({ initialWork }: PublishWorkFormProps) {
  const previewUrls = useRef(new Set<string>());
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<PublishWorkImage[]>(initialWork?.images ?? []);
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
            ...initialOpportunities,
            isOpenCoop: initialWork.isOpenCoop,
            wantsFabric: initialWork.wantsFabric,
            wantsSample: initialWork.wantsSample,
            wantsIncubation: initialWork.wantsIncubation
          }
        }
      : initialForm
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [createdWorkId, setCreatedWorkId] = useState<string | null>(null);

  useEffect(() => {
    const currentPreviewUrls = previewUrls.current;

    return () => {
      currentPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      currentPreviewUrls.clear();
    };
  }, []);

  const revokePreviewUrl = (previewUrl?: string) => {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    previewUrls.current.delete(previewUrl);
  };

  const validationReasons = useMemo(() => {
    const reasons: string[] = [];

    if (images.length < MIN_WORK_IMAGES) {
      reasons.push(`请至少上传 ${MIN_WORK_IMAGES} 张作品图片`);
    }

    if (images.length > MAX_WORK_IMAGES) {
      reasons.push(`最多上传 ${MAX_WORK_IMAGES} 张作品图片`);
    }

    if (images.some((image) => image.isUploading || !image.imageUrl)) {
      reasons.push("图片仍在上传中，请稍候");
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
  }, [form, images]);

  const canSubmit = validationReasons.length === 0;

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage("");

    const selectedFiles = Array.from(files);

    if (images.length + selectedFiles.length > MAX_WORK_IMAGES) {
      setMessage(`最多上传 ${MAX_WORK_IMAGES} 张作品图片。`);
      return;
    }

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMessage("图片格式仅支持 jpg、jpeg、png、webp。");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setMessage("单张图片最大 10MB。");
        return;
      }
    }

    const localImages: PublishWorkImage[] = selectedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);

      return {
        clientId: createClientId(),
        previewUrl,
        isUploading: true,
        imageUrl: "",
        key: "",
        filename: file.name,
        size: file.size,
        mimeType: file.type
      };
    });

    setImages((current) => [...current, ...localImages]);
    setUploading(true);

    for (const [fileIndex, file] of selectedFiles.entries()) {
      const localImage = localImages[fileIndex];
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
        setImages((current) =>
          current.map((image) => (image.clientId === localImage.clientId ? { ...image, isUploading: false } : image))
        );
        setUploading(false);
        return;
      }

      const imageUrl = normalizeImageUrl(data?.imageUrl ?? data?.url);

      if (!imageUrl) {
        setMessage("图片上传成功，但没有返回可提交的图片地址。");
        setImages((current) =>
          current.map((image) => (image.clientId === localImage.clientId ? { ...image, isUploading: false } : image))
        );
        setUploading(false);
        return;
      }

      setImages((current) =>
        current.map((image) =>
          image.clientId === localImage.clientId
            ? {
                ...image,
                imageUrl,
                key: String(data?.key ?? ""),
                filename: String(data?.filename ?? file.name),
                size: Number(data?.size ?? file.size),
                mimeType: String(data?.mimeType ?? file.type),
                isUploading: false
              }
            : image
        )
      );
    }

    setUploading(false);
  };

  const removeImage = async (index: number) => {
    const image = images[index];
    revokePreviewUrl(image.previewUrl);
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
        images: toServerImages(images),
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
      <div className="mx-auto flex min-h-[68dvh] max-w-3xl flex-col justify-center px-4 py-8 text-center md:min-h-[75dvh] md:py-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-ink">
          <Check size={24} />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-ink md:text-4xl">{initialWork ? "作品已重新提交" : "作品已发布"}</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">
          下一步可以查看作品详情，或进入我的孵化进度。
        </p>
        {createdWorkId ? (
          <div className="mt-5 rounded-[8px] border border-black/8 bg-white p-4 text-left shadow-[0_12px_34px_rgba(16,16,16,0.08)]">
            <p className="text-sm font-semibold text-ink">让 AI 帮我检查作品资料</p>
            <p className="mt-2 text-sm leading-6 text-ink/58">AI 诊断需要你主动触发，仅供参考，不会影响作品发布和审核状态。</p>
            <div className="mt-3">
              <WorkAiDiagnosisRequestButton workId={createdWorkId} label="生成 AI 诊断" />
            </div>
          </div>
        ) : null}
        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
          {createdWorkId ? (
            <Link href={`/works/${createdWorkId}`} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white sm:w-auto">
              查看作品
            </Link>
          ) : null}
          <Link href="/me/incubation" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold text-ink sm:w-auto">
            查看我的孵化
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 pb-28 md:px-8 md:py-12">
      <header className="mb-5 md:mb-8">
        <h1 className="text-3xl font-semibold text-ink md:text-5xl">{initialWork ? "编辑作品" : "发布作品"}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/58">
          上传图片，写清楚标题和设计说明，就可以先发布。
        </p>
      </header>

      <section className="space-y-5 rounded-[8px] bg-white p-4 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-6">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">作品图片</h2>
              <p className="mt-2 text-sm text-ink/55">
                上传 {MIN_WORK_IMAGES}-{MAX_WORK_IMAGES} 张，支持 jpg、jpeg、png、webp，单张最大 10MB。
              </p>
            </div>
            <label className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white sm:w-auto">
              <ImagePlus size={16} />
              {uploading ? "上传中..." : "选择图片"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  void uploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {images.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {images.map((image, index) => (
                <div key={image.clientId ?? `${image.imageUrl}-${index}`} className="overflow-hidden rounded-[8px] border border-black/10 bg-paper">
                  <div className="aspect-[3/4] overflow-hidden bg-zinc-200">
                    <img src={image.previewUrl ?? visualFor(index, image.imageUrl)} alt="" className="h-full w-full object-cover object-center" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="text-xs font-semibold text-ink/45">#{index + 1}{image.isUploading ? " 上传中" : ""}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveImage(index, -1)} className="rounded-full border border-black/10 px-2 py-1 text-xs font-semibold">上移</button>
                      <button type="button" onClick={() => moveImage(index, 1)} className="rounded-full border border-black/10 px-2 py-1 text-xs font-semibold">下移</button>
                      <button type="button" onClick={() => void removeImage(index)} className="rounded-full border border-black/10 px-2 py-1 text-xs text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-[8px] border border-dashed border-black/15 bg-paper p-6 text-center text-sm text-ink/50">
              <ImagePlus size={24} />
              <p className="mt-3 font-semibold text-ink/60">先上传作品图片</p>
              <p className="mt-1">手机端可以直接从相册选择。</p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">作品标题</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="例如：城市通勤女装系列"
              className="mt-2 h-12 w-full rounded-[8px] border border-black/10 bg-paper px-4 outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/45">设计说明</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="写清楚灵感、适合人群、面料想法即可。"
              className="mt-2 min-h-36 w-full rounded-[8px] border border-black/10 bg-paper p-4 outline-none focus:border-ink"
            />
          </label>
        </div>

        <details className="rounded-[8px] border border-black/8 bg-paper p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            补充更多信息
            <span className="mt-1 block text-xs font-medium text-ink/45">品类、风格标签和合作方向可以先用默认值，之后再编辑。</span>
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">服装品类</span>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-12 w-full rounded-[8px] border border-black/10 bg-white px-4 outline-none">
                  {categoryOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/45">作品类型</span>
                <select value={form.workType} onChange={(event) => setForm({ ...form, workType: event.target.value })} className="mt-2 h-12 w-full rounded-[8px] border border-black/10 bg-white px-4 outline-none">
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
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${form.styleTags.includes(tag) ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink/55"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {opportunityOptions.map((option) => (
                <label key={option.key} className="flex items-center gap-3 rounded-[8px] border border-black/8 bg-white p-3 text-sm font-semibold">
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
            <label className="flex items-center gap-3 rounded-[8px] bg-white p-3 text-sm font-semibold">
              <input type="checkbox" checked={form.isAiAssisted} onChange={(event) => setForm({ ...form, isAiAssisted: event.target.checked })} />
              这件作品使用了 AI 辅助
            </label>
            <label className="flex items-center gap-3 rounded-[8px] bg-white p-3 text-sm font-semibold">
              <input type="checkbox" checked={form.isOriginal} onChange={(event) => setForm({ ...form, isOriginal: event.target.checked })} />
              我确认该作品为本人原创或已获得授权
            </label>
          </div>
        </details>

        {validationReasons.length > 0 ? (
          <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {validationReasons[0]}
          </div>
        ) : null}

        {message ? <p className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

        <div className="sticky bottom-20 z-30 -mx-4 border-t border-black/8 bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:py-0">
          <button type="button" disabled={submitting || !canSubmit} onClick={() => void submit()} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40 md:w-auto">
            {submitting ? "提交中..." : initialWork ? "保存作品" : "发布作品"}
          </button>
          <p className="mt-2 text-xs leading-5 text-ink/42">点击发布即确认你有权展示该作品。</p>
        </div>
      </section>
    </div>
  );
}
