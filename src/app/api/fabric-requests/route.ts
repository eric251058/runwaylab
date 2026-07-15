import { RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRequestableWork } from "@/lib/requests/work-access";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const fabricRequestSchema = z.object({
  workId: z.string().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  desiredFeeling: z.array(z.string().trim().min(1)).min(1),
  colorDirection: z.string().trim().optional().nullable(),
  budgetRange: z.string().trim().optional().nullable(),
  contact: z.string().trim().min(1),
  remark: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再提交找面料申请。" }, { status: 401 });
  }

  const limit = checkRateLimit(`fabric-request:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return tooManyRequests("提交较频繁，请稍后再试。", limit.retryAfter);

  const parsed = fabricRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请至少填写联系方式和想要的面料感觉。" }, { status: 400 });
  }

  const work = await getRequestableWork(parsed.data.workId, user.id);

  if (parsed.data.workId && !work) {
    return NextResponse.json({ message: "关联作品不存在或不可用于申请。" }, { status: 404 });
  }

  const item = await prisma.fabricRequest.create({
    data: {
      userId: user.id,
      workId: work?.id,
      category: parsed.data.category || undefined,
      desiredFeeling: parsed.data.desiredFeeling,
      colorDirection: parsed.data.colorDirection || undefined,
      budgetRange: parsed.data.budgetRange || undefined,
      contact: parsed.data.contact,
      remark: parsed.data.remark || undefined,
      status: RequestStatus.PENDING
    }
  });

  return NextResponse.json({ request: item }, { status: 201 });
}
