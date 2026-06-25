import { CooperationType, RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

const cooperationRequestSchema = z.object({
  workId: z.string().min(1),
  type: z.nativeEnum(CooperationType),
  contact: z.string().trim().min(1),
  message: z.string().trim().min(1).max(1000),
  budgetRange: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再提交合作意向。" }, { status: 401 });
  }

  const parsed = cooperationRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请填写合作类型、联系方式和合作说明。" }, { status: 400 });
  }

  const work = await prisma.work.findFirst({
    where: {
      id: parsed.data.workId,
      ...publicWorkWhere
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在或暂不可提交合作意向。" }, { status: 404 });
  }

  const item = await prisma.cooperationRequest.create({
    data: {
      userId: user.id,
      workId: work.id,
      type: parsed.data.type,
      contact: parsed.data.contact,
      message: parsed.data.message,
      budgetRange: parsed.data.budgetRange || undefined,
      status: RequestStatus.PENDING
    }
  });

  return NextResponse.json({ request: item }, { status: 201 });
}
