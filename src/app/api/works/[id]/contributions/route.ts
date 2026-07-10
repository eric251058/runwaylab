import { NextResponse } from "next/server";
import { ContributionPersona, ContributionType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

const contributionSchema = z.object({
  persona: z.nativeEnum(ContributionPersona),
  type: z.nativeEnum(ContributionType),
  content: z.string().trim().min(1).max(1000),
  name: z.string().trim().max(100).optional().nullable(),
  contact: z.string().trim().max(100).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = contributionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "建议内容不能为空，且不能超过 1000 字。" }, { status: 400 });
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
    return NextResponse.json({ message: "作品不存在或暂不可提交建议。" }, { status: 404 });
  }

  await prisma.workContribution.create({
    data: {
      workId: id,
      persona: parsed.data.persona,
      type: parsed.data.type,
      content: parsed.data.content,
      name: parsed.data.name || null,
      contact: parsed.data.contact || null
    }
  });

  return NextResponse.json({
    message: "感谢你的建议。平台会根据有效反馈推进作品孵化。"
  }, { status: 201 });
}
