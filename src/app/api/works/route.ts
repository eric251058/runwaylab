import { NextResponse } from "next/server";
import { CooperationType, IncubationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getActiveChallengeId, pendingVisibleState } from "@/lib/works/mutations";
import { workPayloadSchema } from "@/lib/works/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再发布作品。" }, { status: 401 });
  }

  const parsed = workPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请检查作品信息、图片数量和原创声明。" }, { status: 400 });
  }

  const data = parsed.data;
  const activeChallengeId = data.participateChallenge ? await getActiveChallengeId() : null;

  const work = await prisma.$transaction(async (tx) => {
    const created = await tx.work.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        workType: data.workType,
        styleTags: data.styleTags,
        ...pendingVisibleState,
        isOriginal: data.isOriginal,
        isAiAssisted: data.isAiAssisted,
        isOpenCoop: data.isOpenCoop || data.acceptsCopyright || data.acceptsBrandCollab,
        wantsFabric: data.wantsFabric,
        wantsSample: data.wantsSample,
        wantsIncubation: data.wantsIncubation,
        incubationStatus: data.wantsIncubation ? IncubationStatus.CANDIDATE : null,
        images: {
          create: data.images.map((image, index) => ({
            imageUrl: image.imageUrl,
            sortOrder: index
          }))
        }
      },
      include: {
        images: true
      }
    });

    if (activeChallengeId) {
      await tx.challengeEntry.create({
        data: {
          challengeId: activeChallengeId,
          workId: created.id,
          userId: user.id
        }
      });
    }

    if (data.wantsIncubation) {
      await tx.incubationApplication.create({
        data: {
          userId: user.id,
          workId: created.id,
          source: "USER_APPLY",
          status: "CANDIDATE"
        }
      });
    }

    if (data.acceptsCopyright || data.acceptsBrandCollab) {
      await tx.cooperationRequest.createMany({
        data: [
          data.acceptsCopyright
            ? {
                userId: user.id,
                workId: created.id,
                type: CooperationType.COPYRIGHT,
                contact: user.email,
                message: "发布作品时选择接受版权合作。"
              }
            : null,
          data.acceptsBrandCollab
            ? {
                userId: user.id,
                workId: created.id,
                type: CooperationType.BRAND_COLLAB,
                contact: user.email,
                message: "发布作品时选择接受品牌联名。"
              }
            : null
        ].filter(Boolean) as Array<{ userId: string; workId: string; type: CooperationType; contact: string; message: string }>
      });
    }

    return created;
  });

  return NextResponse.json({ work }, { status: 201 });
}
