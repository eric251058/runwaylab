import type { Fabric } from "@prisma/client";
import { saveProviderCenterFabric } from "@/lib/provider-center-actions";

type ProviderFabricFormProps = {
  fabric?: Fabric | null;
};

export function ProviderFabricForm({ fabric }: ProviderFabricFormProps) {
  return (
    <form action={saveProviderCenterFabric} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-2 md:p-5">
      {fabric ? <input type="hidden" name="id" value={fabric.id} /> : null}
      <input name="name" required defaultValue={fabric?.name ?? ""} placeholder="面料名称" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="slug" defaultValue={fabric?.slug ?? ""} placeholder="slug，可选" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="code" defaultValue={fabric?.code ?? ""} placeholder="产品编号" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="imageUrl" defaultValue={fabric?.imageUrl ?? ""} placeholder="主图 URL" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="imageUrls" defaultValue={fabric?.imageUrls.join(", ") ?? ""} placeholder="更多图片 URL，逗号分隔，最多 8 张" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
      <input name="composition" defaultValue={fabric?.composition ?? ""} placeholder="成分" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="weight" defaultValue={fabric?.weight ?? ""} placeholder="克重" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="width" defaultValue={fabric?.width ?? ""} placeholder="门幅" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="color" defaultValue={fabric?.color ?? ""} placeholder="颜色" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="texture" defaultValue={fabric?.texture ?? ""} placeholder="组织结构 / 肌理" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="season" defaultValue={fabric?.season ?? ""} placeholder="适用季节" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="usage" defaultValue={fabric?.usage ?? ""} placeholder="适用品类" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="tags" defaultValue={fabric?.tags.join(", ") ?? ""} placeholder="关键词，逗号分隔" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="priceNote" defaultValue={fabric?.priceNote ?? ""} placeholder="价格说明，可选" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <input name="moqNote" defaultValue={fabric?.moqNote ?? ""} placeholder="MOQ / 样布说明" className="h-12 rounded-[6px] border border-black/10 px-3 text-sm" />
      <textarea name="description" defaultValue={fabric?.description ?? ""} placeholder="产品说明：手感、适合廓形、交期或样布状态。" className="min-h-32 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
      <button className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">{fabric ? "保存面料" : "发布面料"}</button>
    </form>
  );
}
