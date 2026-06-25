import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditWork } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pendingVisibleState } from "@/lib/works/mutations";
import { workPatchSchema } from "@/lib/works/validation";

type WorkRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: WorkRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      images: true
    }
  });

  if (!work || !canEditWork(user, work)) {
    return NextResponse.json({ message: "无权编辑该作品。" }, { status: 403 });
  }

  const parsed = workPatchSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请检查作品信息。" }, { status: 400 });
  }

  const data = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.images) {
      await tx.workImage.deleteMany({
        where: {
          workId: id
        }
      });
    }

    return tx.work.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        workType: data.workType,
        styleTags: data.styleTags,
        isOriginal: data.isOriginal,
        isAiAssisted: data.isAiAssisted,
        isOpenCoop: data.isOpenCoop,
        wantsFabric: data.wantsFabric,
        wantsSample: data.wantsSample,
        wantsIncubation: data.wantsIncubation,
        ...pendingVisibleState,
        rejectReason: null,
        images: data.images
          ? {
              create: data.images.map((image, index) => ({
                imageUrl: image.imageUrl,
                sortOrder: index
              }))
            }
          : undefined
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });
  });

  return NextResponse.json({ work: updated });
}

export async function DELETE(_request: Request, context: WorkRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const work = await prisma.work.findUnique({
    where: { id }
  });

  if (!work || !canEditWork(user, work)) {
    return NextResponse.json({ message: "无权删除该作品。" }, { status: 403 });
  }

  await prisma.work.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}
