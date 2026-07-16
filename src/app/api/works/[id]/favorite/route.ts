import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再收藏。" }, { status: 401 });
  }

  const limit = checkRateLimit(`interaction:favorite:${user.id}:1m`, { windowMs: 60 * 1000, limit: 30 });
  if (limit.limited) return tooManyRequests("操作过于频繁，请稍后再试。", limit.retryAfter);

  const work = await prisma.work.findFirst({
    where: {
      id,
      ...publicWorkWhere
    },
    select: publicQualityWorkCheckSelect
  });

  if (!isPublicWorkAccessible(work)) {
    return NextResponse.json({ message: "作品不存在或暂不可收藏。" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existed = await tx.favorite.findUnique({
      where: {
        userId_workId: {
          userId: user.id,
          workId: id
        }
      }
    });

    if (existed) {
      await tx.favorite.delete({
        where: {
          id: existed.id
        }
      });
      const updated = await tx.work.update({
        where: { id },
        data: {
          favoriteCount: {
            decrement: 1
          }
        },
        select: {
          favoriteCount: true
        }
      });
      return { favorited: false, favoriteCount: Math.max(updated.favoriteCount, 0) };
    }

    await tx.favorite.create({
      data: {
        userId: user.id,
        workId: id
      }
    });
    const updated = await tx.work.update({
      where: { id },
      data: {
        favoriteCount: {
          increment: 1
        }
      },
      select: {
        favoriteCount: true
      }
    });

    return { favorited: true, favoriteCount: updated.favoriteCount };
  });

  return NextResponse.json(result);
}
