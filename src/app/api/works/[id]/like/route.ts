import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再点赞。" }, { status: 401 });
  }

  const work = await prisma.work.findFirst({
    where: {
      id,
      ...publicWorkWhere
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在或暂不可互动。" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existed = await tx.like.findUnique({
      where: {
        userId_workId: {
          userId: user.id,
          workId: id
        }
      }
    });

    if (existed) {
      await tx.like.delete({
        where: {
          id: existed.id
        }
      });
      const updated = await tx.work.update({
        where: { id },
        data: {
          likeCount: {
            decrement: 1
          }
        },
        select: {
          likeCount: true
        }
      });
      return { liked: false, likeCount: Math.max(updated.likeCount, 0) };
    }

    await tx.like.create({
      data: {
        userId: user.id,
        workId: id
      }
    });
    const updated = await tx.work.update({
      where: { id },
      data: {
        likeCount: {
          increment: 1
        }
      },
      select: {
        likeCount: true
      }
    });

    return { liked: true, likeCount: updated.likeCount };
  });

  return NextResponse.json(result);
}
