import { ContentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

const commentSchema = z.object({
  content: z.string().trim().min(1).max(500)
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再评论。" }, { status: 401 });
  }

  const parsed = commentSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "评论内容不能为空。" }, { status: 400 });
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
    return NextResponse.json({ message: "作品不存在或暂不可评论。" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        userId: user.id,
        workId: id,
        content: parsed.data.content,
        status: ContentStatus.VISIBLE
      },
      include: {
        user: true
      }
    });
    const updated = await tx.work.update({
      where: { id },
      data: {
        commentCount: {
          increment: 1
        }
      },
      select: {
        commentCount: true
      }
    });

    return {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          nickname: comment.user.nickname
        }
      },
      commentCount: updated.commentCount
    };
  });

  return NextResponse.json(result, { status: 201 });
}
