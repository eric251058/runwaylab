import Link from "next/link";
import { redirect } from "next/navigation";
import { FabricStatus, ProviderType } from "@prisma/client";
import { LifecycleActionButton } from "@/components/lifecycle/LifecycleActionButton";
import { updateProviderFabricLifecycle } from "@/lib/provider-center-actions";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProviderCenterFabricsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const fabricStatusLabels: Record<FabricStatus, string> = {
  ACTIVE: "公开",
  INACTIVE: "未公开",
  ARCHIVED: "归档",
  UNKNOWN: "待确认",
  RECOMMENDED: "推荐中",
  SELECTED: "已选择",
  CONFIRMED: "已确认"
};

function searchValue(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function visibleImage(value?: string | null) {
  const text = value?.trim();
  return text && /^(https?:\/\/|\/)/i.test(text) ? text : null;
}

function compactMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).slice(0, 2).join(" / ");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(value);
}

function FabricThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const image = visibleImage(imageUrl);
  return image ? (
    <img src={image} alt={name} className="aspect-[4/3] w-full rounded-[10px] object-cover" />
  ) : (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[10px] bg-paper text-sm text-ink/45">
      <span className="font-semibold">暂无产品图片</span>
      <span className="mt-1 text-xs">上传图片</span>
    </div>
  );
}

export default async function ProviderCenterFabricsPage({ searchParams }: ProviderCenterFabricsPageProps) {
  const params = await searchParams;
  const { provider } = await getProviderCenterContext("/provider-center/fabrics");
  if (!provider) redirect("/providers/apply");

  const fabrics = await prisma.fabric.findMany({
    where: { providerId: provider.id },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });
  const saved = searchValue(params, "saved") === "1";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">管理面料</h1>
          <p className="mt-3 text-sm text-ink/52">维护可公开展示的面料产品和图片。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {provider.type === ProviderType.FABRIC_SUPPLIER ? <Link href="/provider-center/fabrics/new" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">新增面料</Link> : null}
          <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-ink">返回中心</Link>
        </div>
      </header>

      {saved ? <div className="mb-5 rounded-[12px] bg-white p-4 text-sm text-ink/62">面料已保存。</div> : null}

      {provider.type !== ProviderType.FABRIC_SUPPLIER ? (
        <div className="rounded-[14px] bg-white p-6 text-sm leading-6 text-ink/58">当前服务商类型不是面料商，暂不能创建面料产品。打样、工厂和专业服务请使用案例管理。</div>
      ) : fabrics.length ? (
        <section>
          <div className="hidden overflow-hidden rounded-[14px] bg-white md:block">
            <div className="grid grid-cols-[112px_1.4fr_1fr_110px_110px_92px] items-center gap-4 border-b border-black/6 px-4 py-3 text-xs font-semibold text-ink/38">
              <span>产品图片</span>
              <span>面料名称</span>
              <span>分类 / 属性</span>
              <span>公开状态</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>
            {fabrics.map((fabric) => (
              <div key={fabric.id} className="grid grid-cols-[112px_1.4fr_1fr_110px_110px_92px] items-center gap-4 border-b border-black/6 px-4 py-4 last:border-b-0">
                <FabricThumb imageUrl={fabric.imageUrl} name={fabric.name} />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-ink">{fabric.name}</h2>
                  {fabric.code ? <p className="mt-1 truncate text-sm text-ink/45">{fabric.code}</p> : null}
                </div>
                <p className="truncate text-sm text-ink/55">{compactMeta([fabric.usage, fabric.composition, fabric.weight]) || "未填写"}</p>
                <span className="text-sm font-semibold text-ink/55">{fabricStatusLabels[fabric.status]}</span>
                <span className="text-sm text-ink/45">{formatDate(fabric.updatedAt)}</span>
                <div className="grid gap-2">
                  <Link href={`/provider-center/fabrics/${fabric.id}/edit`} className="text-sm font-semibold text-ink underline-offset-4 hover:underline">编辑</Link>
                  {fabric.status === FabricStatus.ACTIVE ? (
                    <form action={updateProviderFabricLifecycle}>
                      <input type="hidden" name="id" value={fabric.id} />
                      <input type="hidden" name="action" value="offline" />
                      <LifecycleActionButton label="下架面料" title="下架面料" description={`对象：${fabric.name}`} consequence="下架后不会出现在公开面料库，历史推荐、询盘和项目记录会保留。此操作可恢复。" confirmLabel="下架面料" />
                    </form>
                  ) : (
                    <form action={updateProviderFabricLifecycle}>
                      <input type="hidden" name="id" value={fabric.id} />
                      <input type="hidden" name="action" value="restore" />
                      <LifecycleActionButton label="恢复展示" title="恢复展示" description={`对象：${fabric.name}`} consequence="恢复后面料会重新进入公开面料库。请确认图片、参数和联系方式仍然准确。" confirmLabel="恢复展示" />
                    </form>
                  )}
                  {fabric.status !== FabricStatus.ACTIVE ? (
                    <form action={updateProviderFabricLifecycle}>
                      <input type="hidden" name="id" value={fabric.id} />
                      <input type="hidden" name="action" value="delete" />
                      <LifecycleActionButton variant="destructive" label="删除草稿" title="删除草稿" description={`对象：${fabric.name}`} consequence="系统会先检查推荐、询盘和项目依赖；存在业务记录时不会永久删除。" confirmLabel="删除草稿" />
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:hidden">
          {fabrics.map((fabric) => (
            <article key={fabric.id} className="rounded-[14px] bg-white p-3">
              <FabricThumb imageUrl={fabric.imageUrl} name={fabric.name} />
              <h2 className="mt-3 truncate font-semibold text-ink">{fabric.name}</h2>
              <p className="mt-1 truncate text-sm text-ink/52">{compactMeta([fabric.usage, fabric.composition, fabric.weight]) || fabricStatusLabels[fabric.status]}</p>
              <p className="mt-1 text-xs text-ink/40">{fabricStatusLabels[fabric.status]} / {formatDate(fabric.updatedAt)}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/fabrics/${fabric.slug ?? fabric.id}`} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">查看公开页面</Link>
                <Link href={`/provider-center/fabrics/${fabric.id}/edit`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">编辑</Link>
              </div>
              <div className="mt-3 grid gap-2">
                {fabric.status === FabricStatus.ACTIVE ? (
                  <form action={updateProviderFabricLifecycle}>
                    <input type="hidden" name="id" value={fabric.id} />
                    <input type="hidden" name="action" value="offline" />
                    <LifecycleActionButton label="下架面料" title="下架面料" description={`对象：${fabric.name}`} consequence="下架后不会出现在公开面料库，历史记录会保留。此操作可恢复。" confirmLabel="下架面料" />
                  </form>
                ) : (
                  <form action={updateProviderFabricLifecycle}>
                    <input type="hidden" name="id" value={fabric.id} />
                    <input type="hidden" name="action" value="restore" />
                    <LifecycleActionButton label="恢复展示" title="恢复展示" description={`对象：${fabric.name}`} consequence="恢复后面料会重新进入公开面料库。" confirmLabel="恢复展示" />
                  </form>
                )}
              </div>
            </article>
          ))}
          </div>
        </section>
      ) : (
        <div className="rounded-[14px] bg-white p-6 text-sm leading-6 text-ink/58">
          还没有面料产品。先新增一款面料，并上传清晰的产品图片。
          <div className="mt-4">
            <Link href="/provider-center/fabrics/new" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">新增面料</Link>
          </div>
        </div>
      )}
    </div>
  );
}
