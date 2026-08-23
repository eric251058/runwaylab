"use client";

import { useRef, useState } from "react";
import { ProviderStatus, ProviderType, type ProviderShowcaseItem } from "@prisma/client";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { saveProviderShowcaseItem } from "@/lib/provider-center-actions";
import { providerShowcaseTypeForProvider } from "@/lib/provider-onboarding";

type ProviderShowcaseFormProps = {
  item?: ProviderShowcaseItem | null;
  providerType: ProviderType;
  providerStatus?: ProviderStatus;
};

function formCopy(type: ProviderType) {
  if (type === ProviderType.FACTORY) {
    return {
      title: "生产案例",
      titlePlaceholder: "案例标题",
      categoryPlaceholder: "产品品类",
      contentPlaceholder: "生产内容，如小批量生产、整单加工",
      quantityPlaceholder: "生产数量，如 100 件",
      leadPlaceholder: "生产周期 / 天",
      descriptionPlaceholder: "案例说明：生产难点、质量控制、适合合作类型。不要填写客户机密。"
    };
  }
  if (type === ProviderType.SAMPLE_STUDIO) {
    return {
      title: "打样案例",
      titlePlaceholder: "案例标题",
      categoryPlaceholder: "成衣品类",
      contentPlaceholder: "服务内容，如制版、样衣、修改",
      quantityPlaceholder: "样衣数量，如 1 件",
      leadPlaceholder: "完成周期 / 天",
      descriptionPlaceholder: "案例说明：打样目标、版型难点、工艺和适合的合作类型。不要填写客户机密。"
    };
  }
  return {
    title: "服务案例",
    titlePlaceholder: "案例标题",
    categoryPlaceholder: "服务品类",
    contentPlaceholder: "服务内容",
    quantityPlaceholder: "数量范围",
    leadPlaceholder: "参考周期 / 天",
    descriptionPlaceholder: "案例说明：项目目标、难点、工艺和适合的合作类型。不要填写客户机密。"
  };
}

export function ProviderShowcaseForm({ item, providerType, providerStatus = ProviderStatus.ACTIVE }: ProviderShowcaseFormProps) {
  const copy = formCopy(providerType);
  const showcaseType = providerShowcaseTypeForProvider(providerType);
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const showAiAssist = providerStatus === ProviderStatus.ACTIVE
    && (providerType === ProviderType.FACTORY || providerType === ProviderType.SAMPLE_STUDIO);

  async function handleAiExtract() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const imageUrl = String(formData.get("coverImageUrl") ?? "").trim();
    if (!imageUrl) {
      setExtractMessage("请先上传一张清晰的案例图片。");
      return;
    }
    setIsExtracting(true);
    setExtractMessage("正在读取图片并整理案例草稿…");
    try {
      const response = await fetch("/api/provider/showcase/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl })
      });
      const result = await response.json() as { error?: string; notice?: string; draft?: Record<string, unknown> };
      if (!response.ok || !result.draft) throw new Error(result.error || "识别失败，请手动填写。");
      let filled = 0;
      for (const [name, rawValue] of Object.entries(result.draft)) {
        if (name === "confidence" || name === "warnings") continue;
        const value = Array.isArray(rawValue)
          ? rawValue.join(", ")
          : typeof rawValue === "string" ? rawValue.trim() : "";
        if (!value) continue;
        const control = formRef.current?.elements.namedItem(name);
        if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) continue;
        if (control.value.trim()) continue;
        control.value = value;
        filled += 1;
      }
      const warnings = Array.isArray(result.draft.warnings)
        ? result.draft.warnings.filter((warning): warning is string => typeof warning === "string")
        : [];
      const warningText = warnings.length ? " 注意：" + warnings.join("；") : "";
      setExtractMessage((result.notice || "AI 草稿已生成") + " 已填充 " + filled + " 个空白字段。" + warningText);
    } catch (error) {
      setExtractMessage(error instanceof Error ? error.message : "识别失败，请手动填写。");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <form ref={formRef} action={saveProviderShowcaseItem} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="type" value={showcaseType} />
      <div className="md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">{copy.title}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">上传{copy.title}</h2>
      </div>
      <div className="md:col-span-2">
        <ImageUploader
          name="coverImageUrl"
          value={item?.coverImageUrl}
          label={`上传${copy.title}图片`}
          description="图片会展示在案例卡片和公开服务商主页"
          aspectRatio="4/3"
          uploadType="work"
          onUploadingChange={setIsUploading}
        />
      </div>
      {showAiAssist ? (
        <div className="md:col-span-2 rounded-[8px] border border-black/8 bg-[#f6f6f3] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">从图片生成案例草稿</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">AI 只填空白字段，不覆盖你的内容；资料由你核对并决定是否发布。</p>
            </div>
            <button
              type="button"
              onClick={handleAiExtract}
              disabled={isUploading || isExtracting}
              className="h-10 shrink-0 rounded-full border border-black/12 bg-white px-5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isExtracting ? "正在读取…" : "AI 读取图片"}
            </button>
          </div>
          {extractMessage ? <p role="status" className="mt-3 text-xs leading-5 text-ink/65">{extractMessage}</p> : null}
        </div>
      ) : null}
      <input name="imageUrls" type="hidden" defaultValue={item?.imageUrls.join(", ") ?? ""} />
      <input name="title" required defaultValue={item?.title ?? ""} placeholder={copy.titlePlaceholder} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="category" defaultValue={item?.category ?? ""} placeholder={copy.categoryPlaceholder} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="tags" defaultValue={item?.tags.join(", ") ?? ""} placeholder="标签，逗号分隔" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="materials" defaultValue={item?.materials.join(", ") ?? ""} placeholder={providerType === ProviderType.FACTORY ? "主要面料 / 品类" : "使用材料"} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="techniques" defaultValue={item?.techniques.join(", ") ?? ""} placeholder={copy.contentPlaceholder} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="quantityRange" defaultValue={item?.quantityRange ?? ""} placeholder={copy.quantityPlaceholder} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="moqMin" defaultValue={item?.moqMin ?? ""} placeholder="MOQ" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="leadTimeDays" defaultValue={item?.leadTimeDays ?? ""} placeholder={copy.leadPlaceholder} inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="summary" defaultValue={item?.summary ?? ""} placeholder="摘要，最多 500 字" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="description" defaultValue={item?.description ?? ""} placeholder={copy.descriptionPlaceholder} className="min-h-40 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="capacityText" defaultValue={item?.capacityText ?? ""} placeholder="能力说明，可选" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
        <button name="intent" value="draft" className="h-12 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">保存草稿</button>
        <button name="intent" value="submit" className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white">{providerStatus === ProviderStatus.ACTIVE ? "发布案例" : "保存并加入公开准备"}</button>
      </div>
    </form>
  );
}
