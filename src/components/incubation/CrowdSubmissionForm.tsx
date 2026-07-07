"use client";

import { useMemo, useRef, useState } from "react";

export type CrowdSubmissionKind = "presale" | "fabric" | "sample" | "factory" | "buyer";

type FieldConfig = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
};

type CrowdSubmissionFormProps = {
  kind: CrowdSubmissionKind;
  workId: string;
  workTitle?: string;
};

const titles: Record<CrowdSubmissionKind, string> = {
  presale: "提交预售意向",
  fabric: "推荐面料",
  sample: "提交打样方案",
  factory: "提交生产方案",
  buyer: "提交采购意向"
};

const descriptions: Record<CrowdSubmissionKind, string> = {
  presale: "当前仅收集预售意向，不收款、不生成订单。",
  fabric: "请说明面料信息和推荐理由，设计师会在我的页面查看。",
  sample: "请填写可提供的打样服务、周期和参考价格。",
  factory: "请填写生产能力、起订量、周期和参考单价。",
  buyer: "请填写渠道、采购数量和合作方式，方便设计师判断。"
};

const fields: Record<CrowdSubmissionKind, FieldConfig[]> = {
  presale: [
    { name: "name", label: "姓名", required: true },
    { name: "contact", label: "联系方式", required: true, placeholder: "手机 / 微信 / 邮箱" },
    { name: "size", label: "尺码" },
    { name: "color", label: "颜色" },
    { name: "quantity", label: "数量" },
    { name: "acceptablePrice", label: "可接受价格" },
    { name: "message", label: "留言", multiline: true }
  ],
  fabric: [
    { name: "proposerName", label: "提交人", required: true },
    { name: "companyName", label: "公司名称" },
    { name: "contact", label: "联系方式", required: true, placeholder: "手机 / 微信 / 邮箱" },
    { name: "fabricName", label: "面料名称", required: true },
    { name: "composition", label: "成分" },
    { name: "weight", label: "克重" },
    { name: "width", label: "门幅" },
    { name: "priceRange", label: "价格区间" },
    { name: "imageUrl", label: "面料图片链接" },
    { name: "reason", label: "推荐理由", multiline: true }
  ],
  sample: [
    { name: "proposerName", label: "提交人", required: true },
    { name: "studioName", label: "工作室名称" },
    { name: "contact", label: "联系方式", required: true, placeholder: "手机 / 微信 / 邮箱" },
    { name: "serviceType", label: "服务类型", placeholder: "纸样 / 样衣 / 工艺建议" },
    { name: "category", label: "擅长品类" },
    { name: "leadTime", label: "打样周期" },
    { name: "priceRange", label: "价格区间" },
    { name: "message", label: "方案说明", multiline: true }
  ],
  factory: [
    { name: "proposerName", label: "提交人", required: true },
    { name: "factoryName", label: "工厂名称" },
    { name: "contact", label: "联系方式", required: true, placeholder: "手机 / 微信 / 邮箱" },
    { name: "category", label: "生产品类" },
    { name: "moq", label: "起订量" },
    { name: "leadTime", label: "生产周期" },
    { name: "unitPriceRange", label: "单价区间" },
    { name: "message", label: "生产方案说明", multiline: true }
  ],
  buyer: [
    { name: "buyerName", label: "采购人", required: true },
    { name: "companyName", label: "公司名称" },
    { name: "contact", label: "联系方式", required: true, placeholder: "手机 / 微信 / 邮箱" },
    { name: "channelType", label: "渠道类型", placeholder: "买手店 / 电商 / 集合店 / 采购" },
    { name: "quantity", label: "意向数量" },
    { name: "targetPrice", label: "目标价格" },
    { name: "cooperationType", label: "合作方式" },
    { name: "message", label: "采购说明", multiline: true }
  ]
};

export function CrowdSubmissionForm({ kind, workId, workTitle }: CrowdSubmissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeFields = useMemo(() => fields[kind], [kind]);

  async function submit(formData: FormData) {
    setIsSubmitting(true);
    setMessage("");
    setIsSuccess(false);

    const payload: Record<string, string> = {
      kind,
      workId
    };

    for (const [key, value] of formData.entries()) {
      payload[key] = String(value);
    }

    const response = await fetch("/api/incubation/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "提交失败，请稍后再试");
      setIsSubmitting(false);
      return;
    }

    formRef.current?.reset();
    setIsSuccess(true);
    setMessage("已提交，设计师会在我的页面查看。");
    setIsSubmitting(false);
  }

  return (
    <form ref={formRef} action={submit} className="rounded-[8px] border border-black/8 bg-white p-4 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Crowd Incubation</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{titles[kind]}</h2>
        {workTitle ? <p className="mt-2 text-sm font-semibold text-ink/55">作品：{workTitle}</p> : null}
        <p className="mt-2 text-sm leading-6 text-ink/58">{descriptions[kind]}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeFields.map((field) => (
          <label key={field.name} className={field.multiline ? "sm:col-span-2" : ""}>
            <span className="text-xs font-semibold text-ink/55">
              {field.label}
              {field.required ? <span className="text-red-500"> *</span> : null}
            </span>
            {field.multiline ? (
              <textarea
                name={field.name}
                required={field.required}
                rows={4}
                placeholder={field.placeholder}
                className="mt-2 w-full rounded-[6px] border border-black/10 bg-paper px-3 py-3 text-base outline-none transition focus:border-ink md:text-sm"
              />
            ) : (
              <input
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-3 text-base outline-none transition focus:border-ink md:text-sm"
              />
            )}
          </label>
        ))}
      </div>

      {message ? (
        <p className={`mt-4 rounded-[6px] px-3 py-2 text-sm ${isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-55 sm:w-auto"
      >
        {isSubmitting ? "提交中..." : titles[kind]}
      </button>
    </form>
  );
}
