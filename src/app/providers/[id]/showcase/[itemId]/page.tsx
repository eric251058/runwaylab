import Link from "next/link";
import { notFound } from "next/navigation";
import { ProviderShowcaseStatus } from "@prisma/client";
import { ProviderInquiryForm } from "@/components/providers/ProviderInquiryForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_SHOWCASE_TYPE_LABELS,
  SUPPLY_PROVIDER_TYPE_LABELS,
  listText,
  providerPublicUrl,
  publicProviderWhere,
  visibleImage
} from "@/lib/supply-network";

export const dynamic = "force-dynamic";

type ShowcaseDetailPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

function field(label: string, value?: string | number | null) {
  if (!value) return null;
  return (
    <div className="rounded-[8px] border border-black/8 bg-white p-4">
      <p className="text-xs font-semibold text-ink/35">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function ProviderShowcaseDetailPage({ params }: ShowcaseDetailPageProps) {
  const { id, itemId } = await params;
  const user = await getCurrentUser();
  const item = await prisma.providerShowcaseItem.findFirst({
    where: {
      id: itemId,
      status: ProviderShowcaseStatus.PUBLISHED,
      provider: {
        OR: [{ id }, { slug: id }],
        ...publicProviderWhere()
      }
    },
    include: {
      provider: true
    }
  });

  if (!item) notFound();

  const workOptions = user
    ? await prisma.work.findMany({
        where: { userId: user.id },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 30
      })
    : [];
  const providerUrl = providerPublicUrl(item.provider);
  const loginHref = `/login?next=${encodeURIComponent(`${providerUrl}/showcase/${item.id}#inquiry`)}`;
  const cover = visibleImage(item.coverImageUrl);
  const images = [item.coverImageUrl, ...item.imageUrls].map(visibleImage).filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        {cover ? (
          <img src={cover} alt={item.title} className="aspect-[4/3] w-full rounded-[8px] object-cover" />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[8px] bg-paper text-4xl font-semibold text-ink/30">CASE</div>
        )}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">PRODUCTS & CASES</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">{item.title}</h1>
          <p className="mt-3 text-sm text-ink/52">{[PROVIDER_SHOWCASE_TYPE_LABELS[item.type], item.category].filter(Boolean).join(" / ")}</p>
          <p className="mt-4 text-sm leading-6 text-ink/58">{item.summary || item.description || "该案例用于展示服务商的打样、生产或专业服务能力。"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={providerUrl} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{item.provider.name}</Link>
            <span className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink/55">{SUPPLY_PROVIDER_TYPE_LABELS[item.provider.type]}</span>
            {item.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink/55">{tag}</span>)}
          </div>
          <a href="#inquiry" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">联系服务商</a>
        </section>
      </div>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field("材料", listText(item.materials, ""))}
        {field("工艺", listText(item.techniques, ""))}
        {field("数量范围", item.quantityRange)}
        {field("MOQ", item.moqMin)}
        {field("参考周期", item.leadTimeDays ? `${item.leadTimeDays} 天` : null)}
        {field("产能说明", item.capacityText)}
      </section>

      {item.description ? (
        <section className="mt-10 rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">项目说明</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/58">{item.description}</p>
        </section>
      ) : null}

      {images.length > 1 ? (
        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {images.slice(1, 8).map((image) => (
            <img key={image} src={image} alt={item.title} className="aspect-square rounded-[8px] object-cover" />
          ))}
        </section>
      ) : null}

      <section id="inquiry" className="mt-10">
        <ProviderInquiryForm providerId={item.providerId} showcaseItemId={item.id} workOptions={workOptions} loginHref={loginHref} isLoggedIn={Boolean(user)} />
      </section>
    </div>
  );
}
