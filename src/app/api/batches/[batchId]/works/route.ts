import { NextResponse } from "next/server";
import { BatchWorkStatus, ContentStatus, IncubationBatchStatus, ReviewStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const submitWorkSchema = z.object({
  workId: z.string().min(1),
  nominationReason: z.string().trim().max(500).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { batchId } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再提交作品。" }, { status: 401 });
  }

  const parsed = submitWorkSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "提交内容格式不正确。" }, { status: 400 });
  }

  const [batch, work] = await Promise.all([
    prisma.incubationBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        adminApproved: true,
        status: true
      }
    }),
    prisma.work.findUnique({
      where: { id: parsed.data.workId },
      select: {
        id: true,
        userId: true,
        reviewStatus: true,
        contentStatus: true
      }
    })
  ]);

  if (!batch || !batch.adminApproved || batch.status !== IncubationBatchStatus.RECRUITING) {
    return NextResponse.json({ message: "该批次当前不在招募作品阶段。" }, { status: 403 });
  }

  if (!work || work.userId !== user.id) {
    return NextResponse.json({ message: "只能提交自己的作品。" }, { status: 403 });
  }

  if (work.reviewStatus !== ReviewStatus.APPROVED || work.contentStatus !== ContentStatus.VISIBLE) {
    return NextResponse.json({ message: "作品需要公开展示后才能报名批次。" }, { status: 400 });
  }

  await prisma.incubationBatchWork.upsert({
    where: {
      batchId_workId: {
        batchId,
        workId: work.id
      }
    },
    create: {
      batchId,
      workId: work.id,
      status: BatchWorkStatus.SUBMITTED,
      nominationReason: parsed.data.nominationReason || null
    },
    update: {
      nominationReason: parsed.data.nominationReason || null
    }
  });

  return NextResponse.json({ message: "作品已提交到批次，等待平台评估。" }, { status: 201 });
}
