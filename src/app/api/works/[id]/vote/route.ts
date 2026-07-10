import { NextResponse } from "next/server";
import { WorkVoteType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

const voteSchema = z.object({
  type: z.nativeEnum(WorkVoteType),
  voterName: z.string().trim().max(100).optional().nullable(),
  voterContact: z.string().trim().max(100).optional().nullable(),
  voterPersona: z.string().trim().max(100).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请选择一个有效判断。" }, { status: 400 });
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
    return NextResponse.json({ message: "作品不存在或暂不可参与判断。" }, { status: 404 });
  }

  await prisma.workVote.create({
    data: {
      workId: id,
      type: parsed.data.type,
      voterName: parsed.data.voterName || null,
      voterContact: parsed.data.voterContact || null,
      voterPersona: parsed.data.voterPersona || null
    }
  });

  return NextResponse.json({
    message: "感谢你的判断，平台会结合更多用户反馈评估该作品的孵化方向。"
  }, { status: 201 });
}
