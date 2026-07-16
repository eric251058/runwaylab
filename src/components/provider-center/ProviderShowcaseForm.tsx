import { ProviderType, type ProviderShowcaseItem } from "@prisma/client";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { saveProviderShowcaseItem } from "@/lib/provider-center-actions";
import { providerShowcaseTypeForProvider } from "@/lib/provider-onboarding";

type ProviderShowcaseFormProps = {
  item?: ProviderShowcaseItem | null;
  providerType: ProviderType;
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

export function ProviderShowcaseForm({ item, providerType }: ProviderShowcaseFormProps) {
  const copy = formCopy(providerType);
  const showcaseType = providerShowcaseTypeForProvider(providerType);

  return (
    <form action={saveProviderShowcaseItem} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
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
        />
      </div>
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
        <button name="intent" value="submit" className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white">提交审核</button>
      </div>
    </form>
  );
}
