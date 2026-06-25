import { RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRequestableWork } from "@/lib/requests/work-access";

const sampleRequestSchema = z.object({
  workId: z.string().optional().nullable(),
  garmentCategory: z.string().trim().optional().nullable(),
  hasPattern: z.boolean().default(false),
  hasFabric: z.boolean().default(false),
  needsFabricHelp: z.boolean().default(false),
  budgetRange: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().positive().optional().nullable(),
  expectedDate: z.string().trim().optional().nullable(),
  considerSmallBatch: z.boolean().default(false),
  contact: z.string().trim().min(1),
  remark: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再提交打样申请。" }, { status: 401 });
  }

  const parsed = sampleRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请至少填写联系方式。" }, { status: 400 });
  }

  const work = await getRequestableWork(parsed.data.workId, user.id);

  if (parsed.data.workId && !work) {
    return NextResponse.json({ message: "关联作品不存在或不可用于申请。" }, { status: 404 });
  }

  const remarkParts = [parsed.data.remark, parsed.data.considerSmallBatch ? "考虑小批量生产。" : null].filter(Boolean);
  const item = await prisma.sampleRequest.create({
    data: {
      userId: user.id,
      workId: work?.id,
      garmentCategory: parsed.data.garmentCategory || undefined,
      hasPattern: parsed.data.hasPattern,
      hasFabric: parsed.data.hasFabric,
      needsFabricHelp: parsed.data.needsFabricHelp,
      budgetRange: parsed.data.budgetRange || undefined,
      quantity: parsed.data.quantity || undefined,
      expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : undefined,
      contact: parsed.data.contact,
      remark: remarkParts.join("\n") || undefined,
      status: RequestStatus.PENDING
    }
  });

  return NextResponse.json({ request: item }, { status: 201 });
}
