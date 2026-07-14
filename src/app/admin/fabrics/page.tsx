import { FabricStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveFabric } from "@/lib/provider-market-admin";
import { fabricCoverUrl } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

const fabricStatuses = [FabricStatus.ACTIVE, FabricStatus.INACTIVE, FabricStatus.ARCHIVED] as const;

export default async function AdminFabricsPage() {
  const [fabrics, providers] = await Promise.all([
    prisma.fabric.findMany({ include: { provider: true }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] }),
    prisma.provider.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">面料管理</h1>
      </header>
      <form action={saveFabric} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="name" required placeholder="面料名称" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="providerId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">关联供应商</option>
          {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
        <select name="status" defaultValue={FabricStatus.ACTIVE} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">{fabricStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        <input name="code" placeholder="编号" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="imageUrl" placeholder="图片 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="imageUrls" placeholder="更多图片 URL，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <input name="composition" placeholder="成分" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="weight" placeholder="克重" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="width" placeholder="门幅" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="color" placeholder="颜色" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="texture" placeholder="肌理" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="season" placeholder="季节" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="usage" placeholder="适用品类" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="tags" placeholder="标签，逗号分隔" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="priceNote" placeholder="价格说明" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="moqNote" placeholder="MOQ" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <textarea name="description" placeholder="面料说明" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" />推荐面料</label>
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">新增面料</button>
      </form>

      <section className="mt-8 space-y-3">
        {fabrics.length ? fabrics.map((fabric) => (
          <form key={fabric.id} action={saveFabric} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={fabric.id} />
            <img src={fabricCoverUrl(fabric.imageUrl)} alt={fabric.name} className="size-20 rounded-[6px] object-cover" />
            <input name="name" defaultValue={fabric.name} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={fabric.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="status" defaultValue={fabric.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">{fabricStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select name="providerId" defaultValue={fabric.providerId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联供应商</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
            </select>
            <input name="imageUrls" defaultValue={fabric.imageUrls.join(", ")} placeholder="更多图片 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            {["code", "imageUrl", "composition", "weight", "width", "color", "texture", "season", "usage", "priceNote", "moqNote"].map((key) => (
              <input key={key} name={key} defaultValue={(fabric as unknown as Record<string, string | null>)[key] ?? ""} placeholder={key} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            ))}
            <input name="tags" defaultValue={fabric.tags.join(", ")} placeholder="标签" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={fabric.isFeatured} />推荐</label>
            <textarea name="description" defaultValue={fabric.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无面料。</div>}
      </section>
    </div>
  );
}
