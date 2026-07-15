import { FabricStatus, type Fabric } from "@prisma/client";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { saveProviderCenterFabric } from "@/lib/provider-center-actions";

type ProviderFabricFormProps = {
  fabric?: Fabric | null;
};

export function ProviderFabricForm({ fabric }: ProviderFabricFormProps) {
  return (
    <form action={saveProviderCenterFabric} className="space-y-5">
      {fabric ? <input type="hidden" name="id" value={fabric.id} /> : null}

      <section className="rounded-[14px] bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-ink">产品图片</h2>
        <p className="mt-1 text-sm text-ink/52">上传后会立即预览，保存面料时写入当前图片路径。</p>
        <div className="mt-4">
          <ImageUploader
            name="imageUrl"
            value={fabric?.imageUrl}
            label="上传产品图片"
            description="点击选择图片，电脑端可拖拽上传，手机端可从相册选择。"
            aspectRatio="4/3"
            uploadType="fabrics"
          />
        </div>
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">基本信息</h2>
        </div>
        <input name="name" required defaultValue={fabric?.name ?? ""} placeholder="面料名称" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <select name="status" defaultValue={fabric?.status ?? FabricStatus.ACTIVE} className="h-12 rounded-[10px] border border-black/10 px-3 text-sm">
          <option value={FabricStatus.ACTIVE}>公开展示</option>
          <option value={FabricStatus.INACTIVE}>暂不公开</option>
          <option value={FabricStatus.ARCHIVED}>归档</option>
        </select>
        <input name="code" defaultValue={fabric?.code ?? ""} placeholder="产品编号，可选" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="usage" defaultValue={fabric?.usage ?? ""} placeholder="分类 / 适用品类" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">产品参数</h2>
        </div>
        <input name="composition" defaultValue={fabric?.composition ?? ""} placeholder="成分" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="weight" defaultValue={fabric?.weight ?? ""} placeholder="克重" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="width" defaultValue={fabric?.width ?? ""} placeholder="幅宽" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="color" defaultValue={fabric?.color ?? ""} placeholder="颜色" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="texture" defaultValue={fabric?.texture ?? ""} placeholder="材料 / 肌理 / 工艺" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="tags" defaultValue={fabric?.tags.join(", ") ?? ""} placeholder="关键词，逗号分隔" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
      </section>

      <section className="grid gap-3 rounded-[14px] bg-white p-4 md:grid-cols-2 md:p-5">
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-ink">交易与服务能力</h2>
        </div>
        <input name="moqNote" defaultValue={fabric?.moqNote ?? ""} placeholder="MOQ / 样布支持" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
        <input name="priceNote" defaultValue={fabric?.priceNote ?? ""} placeholder="价格 / 现货 / 交期说明" className="h-12 rounded-[10px] border border-black/10 px-3 text-sm" />
      </section>

      <section className="rounded-[14px] bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-ink">说明</h2>
        <textarea name="description" defaultValue={fabric?.description ?? ""} placeholder="产品说明：手感、适合廓形、适用场景或样布状态。" className="mt-3 min-h-32 w-full rounded-[10px] border border-black/10 px-3 py-3 text-sm" />
        <details className="mt-4 rounded-[10px] bg-paper p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">更多产品信息</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input name="slug" defaultValue={fabric?.slug ?? ""} placeholder="slug，可选" className="h-12 rounded-[10px] border border-black/10 bg-white px-3 text-sm" />
            <input name="season" defaultValue={fabric?.season ?? ""} placeholder="适用季节" className="h-12 rounded-[10px] border border-black/10 bg-white px-3 text-sm" />
            <input name="imageUrls" defaultValue={fabric?.imageUrls.join(", ") ?? ""} placeholder="更多图片 URL，逗号分隔，最多 8 张" className="h-12 rounded-[10px] border border-black/10 bg-white px-3 text-sm md:col-span-2" />
          </div>
        </details>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton className="h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50">
          保存面料
        </SubmitButton>
        <a href="/provider-center/fabrics" className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-semibold text-ink">
          取消
        </a>
      </div>
    </form>
  );
}
