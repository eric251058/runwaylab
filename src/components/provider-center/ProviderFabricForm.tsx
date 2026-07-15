"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { Fabric } from "@prisma/client";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { saveProviderCenterFabric, type ProviderFabricFormState } from "@/lib/provider-center-actions";

type ProviderFabricFormProps = {
  fabric?: Fabric | null;
};

type FieldName = NonNullable<ProviderFabricFormState["values"]> extends infer Values
  ? keyof Values
  : never;

const initialFormState: ProviderFabricFormState = {
  status: "idle"
};

const baseInputClass = "h-12 w-full rounded-[10px] border bg-white px-3 text-sm text-ink outline-none transition focus:border-ink/45";
const baseTextareaClass = "min-h-32 w-full rounded-[10px] border bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-ink/45";

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function inputClass(error?: string) {
  return `${baseInputClass} ${error ? "border-red-300" : "border-black/10"}`;
}

function textareaClass(error?: string) {
  return `${baseTextareaClass} ${error ? "border-red-300" : "border-black/10"}`;
}

export function ProviderFabricForm({ fabric }: ProviderFabricFormProps) {
  const [state, formAction] = useActionState(saveProviderCenterFabric, initialFormState);
  const [isUploading, setIsUploading] = useState(false);
  const fieldErrors = state.fieldErrors ?? {};

  function fieldValue(name: FieldName, fallback = "") {
    return state.values?.[name] ?? fallback;
  }

  const hiddenImageUrls = fieldValue("imageUrls", fabric?.imageUrls.join(", ") ?? "");

  return (
    <form action={formAction} className="space-y-5">
      {fabric ? <input type="hidden" name="id" value={fieldValue("id", fabric.id)} /> : null}
      <input type="hidden" name="imageUrls" value={hiddenImageUrls} />
      <input type="hidden" name="imageUploadState" value={isUploading ? "uploading" : "idle"} />

      {state.status === "error" ? (
        <div role="alert" className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">请检查以下信息</p>
          <p className="mt-1">{state.message ?? "保存失败，请检查后重试。"}</p>
          {fieldErrors.form ? <p className="mt-1">{fieldErrors.form}</p> : null}
        </div>
      ) : null}

      <section className="rounded-[14px] bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-ink">产品图片</h2>
        <p className="mt-1 text-sm text-ink/52">选择后立即预览，保存时写入当前图片路径。</p>
        <div className="mt-4 max-w-[640px]">
          <ImageUploader
            name="imageUrl"
            value={fieldValue("imageUrl", fabric?.imageUrl ?? "")}
            label="上传产品图片"
            aspectRatio="4/3"
            uploadType="fabrics"
            onUploadingChange={setIsUploading}
          />
          {fieldErrors.imageUrl ? <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.imageUrl}</p> : null}
        </div>
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">基本信息</h2>
        </div>
        <Field label="面料名称" error={fieldErrors.name}>
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={fieldValue("name", fabric?.name ?? "")}
            placeholder="例如：雪纺印花"
            className={inputClass(fieldErrors.name)}
          />
        </Field>
        <Field label="状态" error={fieldErrors.status}>
          <select
            name="status"
            defaultValue={fieldValue("status", fabric?.status ?? "ACTIVE")}
            className={inputClass(fieldErrors.status)}
          >
            <option value="ACTIVE">公开展示</option>
            <option value="INACTIVE">暂不公开</option>
            <option value="ARCHIVED">归档</option>
          </select>
        </Field>
        <Field label="产品编号" error={fieldErrors.code}>
          <input
            name="code"
            maxLength={80}
            defaultValue={fieldValue("code", fabric?.code ?? "")}
            placeholder="可选"
            className={inputClass(fieldErrors.code)}
          />
        </Field>
        <Field label="分类 / 适用品类" error={fieldErrors.usage}>
          <input
            name="usage"
            maxLength={160}
            defaultValue={fieldValue("usage", fabric?.usage ?? "")}
            placeholder="例如：裙装、衬衫"
            className={inputClass(fieldErrors.usage)}
          />
        </Field>
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">产品参数</h2>
        </div>
        <Field label="成分" error={fieldErrors.composition}>
          <input name="composition" maxLength={160} defaultValue={fieldValue("composition", fabric?.composition ?? "")} placeholder="例如：100% 涤纶" className={inputClass(fieldErrors.composition)} />
        </Field>
        <Field label="克重" error={fieldErrors.weight}>
          <input name="weight" maxLength={80} defaultValue={fieldValue("weight", fabric?.weight ?? "")} placeholder="例如：75 g/m²" className={inputClass(fieldErrors.weight)} />
        </Field>
        <Field label="幅宽" error={fieldErrors.width}>
          <input name="width" maxLength={80} defaultValue={fieldValue("width", fabric?.width ?? "")} placeholder="例如：150 cm" className={inputClass(fieldErrors.width)} />
        </Field>
        <Field label="颜色" error={fieldErrors.color}>
          <input name="color" maxLength={120} defaultValue={fieldValue("color", fabric?.color ?? "")} placeholder="例如：米白、黑色" className={inputClass(fieldErrors.color)} />
        </Field>
        <Field label="材料 / 肌理 / 工艺" error={fieldErrors.texture}>
          <input name="texture" maxLength={160} defaultValue={fieldValue("texture", fabric?.texture ?? "")} placeholder="例如：雪纺、提花、印花" className={inputClass(fieldErrors.texture)} />
        </Field>
        <Field label="关键词" error={fieldErrors.tags}>
          <input name="tags" maxLength={240} defaultValue={fieldValue("tags", fabric?.tags.join(", ") ?? "")} placeholder="逗号分隔" className={inputClass(fieldErrors.tags)} />
        </Field>
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">交易与服务能力</h2>
        </div>
        <Field label="MOQ / 样布支持" error={fieldErrors.moqNote}>
          <input name="moqNote" maxLength={200} defaultValue={fieldValue("moqNote", fabric?.moqNote ?? "")} placeholder="例如：支持样布，小单起订" className={inputClass(fieldErrors.moqNote)} />
        </Field>
        <Field label="价格 / 现货 / 交期说明" error={fieldErrors.priceNote}>
          <input name="priceNote" maxLength={200} defaultValue={fieldValue("priceNote", fabric?.priceNote ?? "")} placeholder="例如：现货，3 天内发样" className={inputClass(fieldErrors.priceNote)} />
        </Field>
      </section>

      <section className="rounded-[14px] bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-ink">说明</h2>
        <Field label="产品说明" error={fieldErrors.description}>
          <textarea
            name="description"
            maxLength={5000}
            defaultValue={fieldValue("description", fabric?.description ?? "")}
            placeholder="手感、适合廓形、适用场景或样布状态。"
            className={`mt-1 ${textareaClass(fieldErrors.description)}`}
          />
        </Field>
        <details className="mt-4 rounded-[10px] bg-paper p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">更多产品信息</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="slug" error={fieldErrors.slug}>
              <input name="slug" maxLength={120} defaultValue={fieldValue("slug", fabric?.slug ?? "")} placeholder="可选" className={inputClass(fieldErrors.slug)} />
            </Field>
            <Field label="适用季节" error={fieldErrors.season}>
              <input name="season" maxLength={120} defaultValue={fieldValue("season", fabric?.season ?? "")} placeholder="例如：春夏" className={inputClass(fieldErrors.season)} />
            </Field>
          </div>
        </details>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton
          disabled={isUploading}
          disabledText="请先等待图片上传完成"
          pendingText="正在保存…"
          className="h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          保存面料
        </SubmitButton>
        <a href="/provider-center/fabrics" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-ink">
          取消
        </a>
      </div>
    </form>
  );
}
