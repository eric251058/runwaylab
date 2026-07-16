"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { applyProvider } from "@/lib/provider-market-admin";

type ClientProviderType = "FABRIC_SUPPLIER" | "SAMPLE_STUDIO" | "FACTORY";

type SubmitProviderApplicationFormProps = {
  initialType?: ClientProviderType | null;
};

const providerCards: Record<ClientProviderType, {
  title: string;
  description: string;
  button: string;
  strengths: string[];
}> = {
  FABRIC_SUPPLIER: {
    title: "面料供应商",
    description: "展示面料产品，并向设计师推荐适合的面料。",
    button: "入驻成为面料供应商",
    strengths: ["上传面料产品", "推荐给设计师", "承接样布咨询"]
  },
  SAMPLE_STUDIO: {
    title: "打样工作室",
    description: "承接制版、样衣制作和小单打样需求。",
    button: "入驻成为打样工作室",
    strengths: ["制版与样衣", "单件打样", "小单支持"]
  },
  FACTORY: {
    title: "生产工厂",
    description: "承接小批量生产和后续量产合作。",
    button: "入驻成为生产工厂",
    strengths: ["小批量生产", "月产能展示", "生产案例"]
  }
};

const categoryOptions = [
  ["DRESS", "连衣裙"],
  ["SHIRT", "衬衫"],
  ["SUIT", "西装"],
  ["COAT", "外套"],
  ["KNITWEAR", "针织"],
  ["PANTS", "裤装"],
  ["EVENING_WEAR", "礼服"],
  ["CHILDREN", "童装"],
  ["OTHER", "其他"]
] as const;

function typeTitle(type: ClientProviderType) {
  return providerCards[type].title;
}

function fieldError(errors: Record<string, string>, name: string) {
  return errors[name] ? <p className="mt-1 text-xs font-semibold text-red-600">{errors[name]}</p> : null;
}

function validate(formData: FormData, selectedType: ClientProviderType | null) {
  const errors: Record<string, string> = {};
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  if (!selectedType) errors.providerType = "请选择服务商类型。";
  if (!text("companyName")) errors.companyName = "请填写服务商名称。";
  if (!text("contactName")) errors.contactName = "请填写联系人。";
  if (!text("phone")) errors.phone = "请填写联系电话。";
  if (!text("city")) errors.city = "请填写所在城市。";
  const description = text("description");
  if (description.length < 20) errors.description = "简介至少 20 个字。";
  if (description.length > 500) errors.description = "简介最多 500 个字。";
  if (formData.get("acceptRules") !== "on") errors.acceptRules = "请确认接受平台合作规则。";

  return errors;
}

export function SubmitProviderApplicationForm({ initialType }: SubmitProviderApplicationFormProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ClientProviderType | null>(initialType ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function chooseType(type: ClientProviderType) {
    setSelectedType(type);
    setMessage("");
    setErrors({});
    router.replace(`/providers/apply?type=${type}`, { scroll: false });
  }

  function onSubmit(formData: FormData) {
    setMessage("");
    const nextErrors = validate(formData, selectedType);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (selectedType) formData.set("providerType", selectedType);

    startTransition(async () => {
      try {
        await applyProvider(formData);
        setSubmitted(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/65">
        申请已提交。平台审核后，你可以进入对应服务商工作台上传产品或案例。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        {(Object.keys(providerCards) as ClientProviderType[]).map((type) => {
          const card = providerCards[type];
          const active = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => chooseType(type)}
              className={`rounded-[8px] border p-4 text-left transition ${
                active ? "border-ink bg-white shadow-[0_14px_42px_rgba(16,16,16,0.08)]" : "border-black/8 bg-white hover:border-ink/30"
              }`}
            >
              <span className="block text-lg font-semibold text-ink">{card.title}</span>
              <span className="mt-2 block text-sm leading-6 text-ink/55">{card.description}</span>
              <span className="mt-4 flex flex-wrap gap-2">
                {card.strengths.slice(0, 3).map((strength) => (
                  <span key={strength} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{strength}</span>
                ))}
              </span>
              <span className={`mt-4 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold ${active ? "bg-ink text-white" : "bg-paper text-ink"}`}>
                {card.button}
              </span>
            </button>
          );
        })}
      </section>

      {!selectedType ? (
        <div className="rounded-[8px] border border-black/8 bg-white p-5 text-sm leading-6 text-ink/58">
          请选择一种服务商类型，系统会显示对应的入驻资料。
        </div>
      ) : (
        <form action={onSubmit} className="space-y-4 rounded-[8px] border border-black/8 bg-white p-4 md:p-5">
          <input type="hidden" name="providerType" value={selectedType} />
          {message ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Step 2</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{typeTitle(selectedType)}入驻资料</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">只填写审核所需信息，更多资料可在审核通过后继续完善。</p>
          </div>

          <section className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-ink">服务商名称</span>
              <input name="companyName" placeholder={selectedType === "FACTORY" ? "工厂名称" : selectedType === "SAMPLE_STUDIO" ? "工作室名称" : "公司/品牌名称"} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
              {fieldError(errors, "companyName")}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">联系人</span>
              <input name="contactName" placeholder="联系人姓名" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
              {fieldError(errors, "contactName")}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">联系电话</span>
              <input name="phone" placeholder="手机号或固定电话" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
              {fieldError(errors, "phone")}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">所在城市</span>
              <input name="city" placeholder="如 上海、杭州、广州" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 px-3 text-sm" />
              {fieldError(errors, "city")}
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-ink">简介</span>
              <textarea name="description" placeholder="用 20-500 字说明主营方向、适合服务的项目和基本能力。" className="mt-2 min-h-28 w-full rounded-[6px] border border-black/10 px-3 py-3 text-sm leading-6" />
              {fieldError(errors, "description")}
            </label>
          </section>

          {selectedType === "FABRIC_SUPPLIER" ? (
            <section className="grid gap-3 md:grid-cols-2">
              <input name="specialties" placeholder="主营面料，如 棉麻, 真丝, 梭织" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="categories" placeholder="产品类别，如 女装面料, 衬衫面料" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
              <select name="sampleSupported" defaultValue="true" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                <option value="true">支持寄样</option>
                <option value="false">暂不寄样</option>
              </select>
              <input name="minimumOrder" placeholder="默认起订量，如 50 米起" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
              <input name="leadTime" placeholder="常规交期，如 3-7 天" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            </section>
          ) : null}

          {selectedType === "SAMPLE_STUDIO" ? (
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-ink">擅长品类</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryOptions.map(([value, label]) => (
                    <label key={value} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-paper px-3 text-sm">
                      <input type="checkbox" name="specialties" value={label} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select name="patternMaking" defaultValue="需确认" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                  <option value="是">提供制版</option>
                  <option value="否">不提供制版</option>
                  <option value="需确认">制版需确认</option>
                </select>
                <select name="singleSampleSupported" defaultValue="true" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                  <option value="true">支持单件打样</option>
                  <option value="false">暂不支持单件</option>
                </select>
                <select name="smallOrderSupported" defaultValue="true" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                  <option value="true">支持小单</option>
                  <option value="false">暂不支持小单</option>
                </select>
                <input name="leadTime" placeholder="打样周期，如 3-5 天" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="priceRange" placeholder="参考价格，如 样衣 300-800 元" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
              </div>
            </section>
          ) : null}

          {selectedType === "FACTORY" ? (
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-ink">主营品类</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryOptions.map(([value, label]) => (
                    <label key={value} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-paper px-3 text-sm">
                      <input type="checkbox" name="specialties" value={label} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select name="smallOrderSupported" defaultValue="true" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                  <option value="true">支持小单</option>
                  <option value="false">暂不支持小单</option>
                </select>
                <select name="sampleSupported" defaultValue="true" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
                  <option value="true">支持打样</option>
                  <option value="false">暂不支持打样</option>
                </select>
                <input name="minimumOrder" placeholder="起订量，如 100 件起" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="monthlyCapacity" placeholder="月产能，如 5000 件" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
                <input name="leadTime" placeholder="生产周期，如 15-25 天" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
                <textarea name="qualityControl" placeholder="质量控制说明，最多 500 字" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
              </div>
            </section>
          ) : null}

          <details className="rounded-[8px] bg-paper p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">补充更多信息</summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input name="email" placeholder="联系邮箱，默认使用登录邮箱" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
              <input name="wechat" placeholder="微信，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
              <input name="address" placeholder="详细地址，可选" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
              <input name="serviceArea" placeholder="服务区域，如 全国、华东、浙江" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
              <input name="responseTime" placeholder="响应时间，如 1 个工作日内" className="h-12 rounded-[6px] border border-black/10 bg-white px-3 text-sm md:col-span-2" />
              <div className="md:col-span-2">
                <ImageUploader
                  name="logoUrl"
                  label="上传 Logo"
                  description="可选，JPG、PNG、WebP"
                  aspectRatio="1/1"
                  uploadType="avatar"
                />
              </div>
            </div>
          </details>

          <label className="flex items-start gap-2 text-sm leading-6 text-ink/58">
            <input name="acceptRules" type="checkbox" className="mt-1" />
            <span>我确认接受平台合作规则，并保证提交的信息真实有效。</span>
          </label>
          {fieldError(errors, "acceptRules")}

          <button disabled={isPending} className="h-12 w-full rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {isPending ? "提交中..." : "提交入驻申请"}
          </button>
        </form>
      )}
    </div>
  );
}
