import Link from "next/link";
import type { Metadata } from "next";
import { SafeImage } from "@/components/media/SafeImage";
import { prisma } from "@/lib/prisma";
import { PROVIDER_TYPE_LABELS } from "@/lib/provider-market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "面料库",
  description: "查看 RunwayLab 可用于作品孵化和打样生产的专业面料信息。"
};

function formatComposition(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/\b100%\s*P\b/gi, "100% 涤纶")
    .replace(/\bP\b/g, "涤纶")
    .trim();
}

function formatWeight(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/\s*GSM\b/gi, " g/m²")
    .replace(/\s*G\/M2\b/gi, " g/m²")
    .replace(/\s*gsm\b/g, " g/m²")
    .trim();
}

function formatWidth(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/\s*CM\b/gi, " cm")
    .replace(/\s*cm\b/g, " cm")
    .trim();
}

function fabricParams(fabric: { composition?: string | null; weight?: string | null; width?: string | null }) {
  return [formatComposition(fabric.composition), formatWeight(fabric.weight), formatWidth(fabric.width)].filter(Boolean).join(" · ");
}

function usageText(value?: string | null) {
  return value ? `适用：${value}` : null;
}

export default async function FabricsPage() {
  const fabrics = await prisma.fabric.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 min-w-0 md:mb-8">
        <h1 className="text-3xl font-semibold text-ink md:text-5xl">面料库</h1>
        <div className="mt-3 flex flex-col gap-2 text-sm text-ink/55 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl leading-6">查看可用于作品孵化和打样生产的专业面料。</p>
          <p className="shrink-0 font-semibold">{fabrics.length} 款面料</p>
        </div>
      </header>

      {fabrics.length ? (
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fabrics.map((fabric) => {
            const params = fabricParams(fabric);
            const supplier = fabric.provider ? `${fabric.provider.name} · ${PROVIDER_TYPE_LABELS[fabric.provider.type]}` : "供应商待对接";

            return (
              <Link
                key={fabric.id}
                href={`/fabrics/${fabric.slug ?? fabric.id}`}
                className="block min-w-0 overflow-hidden rounded-[14px] border border-black/10 bg-white transition hover:border-black/20"
              >
                <SafeImage
                  src={fabric.imageUrl}
                  alt={fabric.name}
                  className="aspect-[4/3] w-full rounded-t-[14px] object-cover"
                />
                <div className="min-w-0 space-y-2 p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{fabric.name}</h2>
                    {fabric.isFeatured ? <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">推荐</span> : null}
                  </div>
                  {params ? <p className="truncate text-sm leading-6 text-ink/58">{params}</p> : null}
                  {usageText(fabric.usage) ? <p className="truncate text-sm leading-6 text-ink/50">{usageText(fabric.usage)}</p> : null}
                  <p className="truncate text-xs font-semibold text-ink/38">{supplier}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-black/10 bg-white p-6 text-sm leading-6 text-ink/55">
          <p className="font-semibold text-ink">暂无符合条件的面料</p>
          <p className="mt-2">调整筛选条件后再试。</p>
        </div>
      )}
    </div>
  );
}
