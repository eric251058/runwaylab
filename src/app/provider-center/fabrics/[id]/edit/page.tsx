import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProviderType } from "@prisma/client";
import { ProviderFabricForm } from "@/components/provider-center/ProviderFabricForm";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditProviderFabricPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProviderFabricPage({ params }: EditProviderFabricPageProps) {
  const { id } = await params;
  const { provider } = await getProviderCenterContext(`/provider-center/fabrics/${id}/edit`);
  if (!provider) redirect("/providers/apply");
  if (provider.type !== ProviderType.FABRIC_SUPPLIER) redirect("/provider-center/fabrics");

  const fabric = await prisma.fabric.findFirst({
    where: { id, providerId: provider.id }
  });

  if (!fabric) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink md:text-5xl">编辑面料</h1>
          <p className="mt-3 text-sm text-ink/52">更换图片或更新面料信息后保存。</p>
        </div>
        <Link href="/provider-center/fabrics" className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-ink">取消</Link>
      </header>
      <ProviderFabricForm fabric={fabric} />
    </div>
  );
}
