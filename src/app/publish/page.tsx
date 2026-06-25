import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditWork } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PublishWorkForm, type PublishInitialWork } from "@/components/publish/PublishWorkForm";

export const dynamic = "force-dynamic";

type PublishPageProps = {
  searchParams?: Promise<{
    edit?: string;
  }>;
};

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/publish");
  }

  const params = await searchParams;

  if (!params?.edit) {
    return <PublishWorkForm />;
  }

  const work = await prisma.work.findUnique({
    where: {
      id: params.edit
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (!work || !canEditWork(user, work)) {
    redirect("/me");
  }

  const initialWork: PublishInitialWork = {
    id: work.id,
    title: work.title,
    description: work.description,
    category: work.category,
    workType: work.workType,
    styleTags: work.styleTags,
    isAiAssisted: work.isAiAssisted,
    isOriginal: work.isOriginal,
    isOpenCoop: work.isOpenCoop,
    wantsFabric: work.wantsFabric,
    wantsSample: work.wantsSample,
    wantsIncubation: work.wantsIncubation,
    images: work.images.map((image) => ({
      imageUrl: image.imageUrl,
      key: image.imageUrl.replace(/^\/uploads\//, ""),
      filename: image.imageUrl.split("/").pop() ?? "work-image",
      size: 0,
      mimeType: "image/webp"
    }))
  };

  return <PublishWorkForm initialWork={initialWork} />;
}
