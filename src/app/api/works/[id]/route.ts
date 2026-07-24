import { NextResponse } from "next/server";
import { ContentStatus, ReviewStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canHardDeleteWork,
  canOfflineWork,
  canResubmitOfflineWork,
  getWorkDeleteDependencies,
  lifecycleConflict
} from "@/lib/content-lifecycle";
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

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      images: true
    }
  });

  if (action) {
    if (!work || (user.role !== "ADMIN" && work.userId !== user.id)) {
      return NextResponse.json({ ok: false, message: "没有权限操作该作品。" }, { status: 403 });
    }

    if (action === "offline") {
      if (!canOfflineWork(work)) {
        return NextResponse.json({ ok: false, message: "当前作品状态不能下架；如需归档历史记录，需要后续 Migration 支持。" }, { status: 422 });
      }
      const updated = await prisma.work.update({
        where: { id },
        data: {
          reviewStatus: ReviewStatus.OFFLINE,
          contentStatus: ContentStatus.OFFLINE
        }
      });
      return NextResponse.json({ ok: true, action: "offline", work: updated });
    }

    if (action === "resubmit") {
      if (!canResubmitOfflineWork(work)) {
        return NextResponse.json({ ok: false, message: "当前作品不需要重新提交。" }, { status: 422 });
      }
      const updated = await prisma.work.update({
        where: { id },
        data: {
          ...pendingVisibleState,
          rejectReason: null
        }
      });
      return NextResponse.json({ ok: true, action: "restored", work: updated });
    }

    return NextResponse.json({ ok: false, message: "生命周期操作不支持。" }, { status: 422 });
  }

  if (!work || !canEditWork(user, work)) {
    return NextResponse.json({ message: "无权编辑该作品。" }, { status: 403 });
  }

  const parsed = workPatchSchema.safeParse(body);

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

  return NextResponse.json({
    work: {
      ...updated,
      images: updated.images.map((image) => ({
        ...image,
        imageUrl: image.imageUrl,
        url: image.imageUrl,
        src: image.imageUrl,
        sortOrder: image.sortOrder
      }))
    }
  });
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

  if (!work || (user.role !== "ADMIN" && work.userId !== user.id)) {
    return NextResponse.json({ message: "无权删除该作品。" }, { status: 403 });
  }

  const dependencies = await getWorkDeleteDependencies(id);
  if (!canHardDeleteWork(work, dependencies)) {
    if (canOfflineWork(work)) {
      return NextResponse.json(
        {
          ok: false,
          code: "USE_OFFLINE",
          message: "该作品已经公开展示，不能直接永久删除。你可以先将它下架，历史推荐、询盘和孵化记录会被保留。",
          dependencies
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      lifecycleConflict("该作品已经产生互动或合作记录，不能永久删除。你可以将它下架或保留为历史记录。", dependencies),
      { status: 409 }
    );
  }

  await prisma.work.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true, action: "deleted" });
}
