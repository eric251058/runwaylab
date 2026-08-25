import { NextResponse } from "next/server";
import { ProviderOpportunityInterestStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const decisionSchema = z.object({
  status: z.enum(["SHORTLISTED", "DECLINED"])
});

type RouteContext = {
  params: Promise<{
    workId: string;
    interestId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const limit = checkRateLimit(`provider-interest-decision:${user.id}:1h`, {
    windowMs: 60 * 60 * 1000,
    limit: 60
  });
  if (limit.limited) return tooManyRequests("操作较频繁，请稍后再试。", limit.retryAfter);

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "请选择有效的处理结果。" }, { status: 400 });
  }

  const { workId, interestId } = await context.params;
  const interest = await prisma.providerOpportunityInterest.findFirst({
    where: { id: interestId, workId },
    select: {
      id: true,
      status: true,
      work: { select: { userId: true, title: true } },
      provider: { select: { name: true, ownerId: true } }
    }
  });

  if (!interest) {
    return NextResponse.json({ message: "服务商响应不存在。" }, { status: 404 });
  }
  if (interest.work.userId !== user.id) {
    return NextResponse.json({ message: "你无权处理此作品的服务商响应。" }, { status: 403 });
  }
  if (interest.status === ProviderOpportunityInterestStatus.CLOSED) {
    return NextResponse.json({ message: "该响应已经关闭，不能再次处理。" }, { status: 409 });
  }

  const status = parsed.data.status as ProviderOpportunityInterestStatus;
  await prisma.providerOpportunityInterest.update({
    where: { id: interest.id },
    data: { status }
  });

  await createNotificationSafe({
    recipientId: interest.provider.ownerId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: status === ProviderOpportunityInterestStatus.SHORTLISTED ? "你的合作响应已进入洽谈" : "你的合作响应暂未入选",
    body: status === ProviderOpportunityInterestStatus.SHORTLISTED
      ? `作品方已将你对《${interest.work.title}》的响应列入洽谈名单，请留意后续合作消息。`
      : `作品方已处理你对《${interest.work.title}》的响应，本轮暂未进入洽谈。`,
    targetUrl: "/providers/opportunities",
    dedupe: false
  });

  return NextResponse.json({
    message: status === ProviderOpportunityInterestStatus.SHORTLISTED ? "已邀请该服务商进入洽谈。" : "已婉拒该服务商响应。"
  });
}
