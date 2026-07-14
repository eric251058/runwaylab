import { ProviderShowcaseType, type ProviderShowcaseItem } from "@prisma/client";
import { saveProviderShowcaseItem } from "@/lib/provider-center-actions";
import { PROVIDER_SHOWCASE_TYPE_LABELS } from "@/lib/supply-network";

type ProviderShowcaseFormProps = {
  item?: ProviderShowcaseItem | null;
};

export function ProviderShowcaseForm({ item }: ProviderShowcaseFormProps) {
  return (
    <form action={saveProviderShowcaseItem} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <select name="type" defaultValue={item?.type ?? ProviderShowcaseType.SAMPLE_CASE} className="h-12 rounded-[6px] border border-black/10 px-3 text-sm">
        {Object.values(ProviderShowcaseType).map((type) => (
          <option key={type} value={type}>{PROVIDER_SHOWCASE_TYPE_LABELS[type]}</option>
        ))}
      </select>
      <input name="title" required defaultValue={item?.title ?? ""} placeholder="案例标题" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="category" defaultValue={item?.category ?? ""} placeholder="品类" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="coverImageUrl" defaultValue={item?.coverImageUrl ?? ""} placeholder="封面图片 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="imageUrls" defaultValue={item?.imageUrls.join(", ") ?? ""} placeholder="更多图片 URL，最多 8 张" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
      <input name="tags" defaultValue={item?.tags.join(", ") ?? ""} placeholder="标签，逗号分隔" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="materials" defaultValue={item?.materials.join(", ") ?? ""} placeholder="使用材料" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="techniques" defaultValue={item?.techniques.join(", ") ?? ""} placeholder="工艺" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="quantityRange" defaultValue={item?.quantityRange ?? ""} placeholder="数量范围" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="moqMin" defaultValue={item?.moqMin ?? ""} placeholder="MOQ" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="leadTimeDays" defaultValue={item?.leadTimeDays ?? ""} placeholder="参考周期 / 天" inputMode="numeric" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="summary" defaultValue={item?.summary ?? ""} placeholder="摘要，最多 500 字" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="description" defaultValue={item?.description ?? ""} placeholder="详细说明：项目目标、难点、工艺和适合的合作类型。不要填写客户机密。" className="min-h-40 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <textarea name="capacityText" defaultValue={item?.capacityText ?? ""} placeholder="能力说明，可选" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
        <button name="intent" value="draft" className="h-12 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">保存草稿</button>
        <button name="intent" value="submit" className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white">提交审核</button>
      </div>
    </form>
  );
}
