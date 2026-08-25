import { NextResponse } from "next/server";
import {
  CollaborationProjectEventType,
  CollaborationProjectStatus,
  CollaborationProjectVisibility,
  Prisma,
  ProviderOpportunityInterestStatus
} from "@prisma/client";
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
      collaborationProjectId: true,
      status: true,
      work: { select: { userId: true, title: true } },
      provider: { select: { id: true, name: true, ownerId: true } },
      note: true,
      expectedPriceMin: true,
      expectedPriceMax: true,
      minimumQuantity: true,
      leadDays: true
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
  if (
    status === ProviderOpportunityInterestStatus.DECLINED
    && (interest.status === ProviderOpportunityInterestStatus.SHORTLISTED || interest.collaborationProjectId)
  ) {
    return NextResponse.json({ message: "该服务商已经进入协作项目；如需终止合作，请在项目内处理。" }, { status: 409 });
  }

  let collaborationProjectId = interest.collaborationProjectId;

  if (status === ProviderOpportunityInterestStatus.SHORTLISTED && !collaborationProjectId) {
    try {
      collaborationProjectId = await prisma.$transaction(async (tx) => {
        const current = await tx.providerOpportunityInterest.findUnique({
          where: { id: interest.id },
          select: { collaborationProjectId: true }
        });
        if (current?.collaborationProjectId) return current.collaborationProjectId;

        const priceMin = interest.expectedPriceMin?.toString();
        const priceMax = interest.expectedPriceMax?.toString();
        const termsSummary = [
          priceMin || priceMax ? "参考报价 ¥" + (priceMin ?? "—") + "–¥" + (priceMax ?? "—") : null,
          interest.minimumQuantity ? "起订 " + interest.minimumQuantity : null,
          interest.leadDays ? "交期 " + interest.leadDays + " 天" : null,
          interest.note
        ].filter(Boolean).join(" · ");

        const project = await tx.collaborationProject.create({
          data: {
            title: "《" + interest.work.title + "》× " + interest.provider.name,
            workId,
            designerId: user.id,
            ownerUserId: user.id,
            providerId: interest.provider.id,
            createdById: user.id,
            status: CollaborationProjectStatus.PLANNING,
            visibility: CollaborationProjectVisibility.PRIVATE,
            summary: termsSummary || "双方已进入合作洽谈。",
            description: "这是作品方与服务商的私密洽谈空间。请在确认范围、报价、交期与交付标准后再开始履约。"
          },
          select: { id: true }
        });

        await tx.collaborationProjectEvent.create({
          data: {
            projectId: project.id,
            actorId: user.id,
            eventType: CollaborationProjectEventType.PROJECT_CREATED,
            note: "作品方邀请服务商进入洽谈"
          }
        });

        await tx.providerOpportunityInterest.update({
          where: { id: interest.id },
          data: { status: ProviderOpportunityInterestStatus.SHORTLISTED, collaborationProjectId: project.id }
        });

        return project.id;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const latest = await prisma.providerOpportunityInterest.findUnique({
        where: { id: interest.id },
        select: { collaborationProjectId: true }
      });
      if (!latest?.collaborationProjectId) {
        console.error("Provider negotiation project creation failed", { errorType: error instanceof Error ? error.name : typeof error });
        return NextResponse.json({ message: "洽谈空间创建失败，请稍后再试。" }, { status: 500 });
      }
      collaborationProjectId = latest.collaborationProjectId;
    }
  } else {
    await prisma.providerOpportunityInterest.update({ where: { id: interest.id }, data: { status } });
  }

  await createNotificationSafe({
    recipientId: interest.provider.ownerId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: status === ProviderOpportunityInterestStatus.SHORTLISTED ? "你的合作响应已进入洽谈" : "你的合作响应暂未入选",
    body: status === ProviderOpportunityInterestStatus.SHORTLISTED
      ? "作品方已邀请你就《" + interest.work.title + "》进入私密洽谈空间。"
      : "作品方已处理你对《" + interest.work.title + "》的响应，本轮暂未进入洽谈。",
    targetUrl: collaborationProjectId ? "/me/projects/collaboration/" + collaborationProjectId : "/providers/opportunities",
    dedupe: false
  });

  return NextResponse.json({
    message: status === ProviderOpportunityInterestStatus.SHORTLISTED ? "洽谈空间已创建。" : "已婉拒该服务商响应。",
    collaborationProjectId
  });
}
