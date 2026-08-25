import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { getPrivateCollaborationProjectForViewer } from "@/lib/private-collaboration-projects";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const optionalText = z.string().trim().max(1200).nullable().optional();
const optionalNumber = z.number().int().min(0).max(100_000_000).nullable().optional();

const proposalSchema = z.object({
  type: z.enum(["FABRIC", "SAMPLE", "PRODUCTION", "BUYER_INTENT", "OTHER"]),
  title: z.string().trim().min(2, "请填写方案标题。").max(100),
  summary: z.string().trim().min(10, "请简要说明交付范围。").max(500),
  description: optionalText,
  estimatedPrice: z.string().trim().min(1, "请填写报价说明。").max(160),
  estimatedTime: z.string().trim().min(1, "请填写交付周期。").max(120),
  moq: z.string().trim().min(1, "请填写起订要求。").max(120),
  priceMin: optionalNumber,
  priceMax: optionalNumber,
  leadTimeDays: z.number().int().min(1).max(730).nullable().optional(),
  minimumQuantity: optionalNumber
}).superRefine((value, context) => {
  if (value.priceMin != null && value.priceMax != null && value.priceMin > value.priceMax) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceMax"],
      message: "最高报价不能低于最低报价。"
    });
  }
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit("private-project-proposal:" + user.id + ":30m", {
    windowMs: 30 * 60 * 1000,
    limit: 8
  });
  if (limit.limited) return tooManyRequests("方案提交较频繁，请稍后再试。", limit.retryAfter);

  const parsed = proposalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "请检查方案内容。" },
      { status: 422 }
    );
  }

  const { id } = await context.params;
  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) {
    return NextResponse.json({ message: "洽谈项目不存在或你无权访问。" }, { status: 404 });
  }
  if (!project.workId || !project.providerId || project.provider?.ownerId !== user.id) {
    return NextResponse.json({ message: "只有当前合作服务商可以提交方案。" }, { status: 403 });
  }
  const workId = project.workId;
  const providerId = project.providerId;

  const accepted = await prisma.providerWorkProposal.findFirst({
    where: { projectId: project.id, status: "ACCEPTED" },
    select: { id: true }
  });
  if (accepted) {
    return NextResponse.json({ message: "方案已确认。如需变更，请先在洽谈区说明原因。" }, { status: 409 });
  }

  const proposal = await prisma.$transaction(async (tx) => {
    await tx.providerWorkProposal.updateMany({
      where: {
        projectId: project.id,
        status: { in: ["PENDING", "SHORTLISTED"] }
      },
      data: { status: "REJECTED" }
    });
    const acceptedAfterLock = await tx.providerWorkProposal.findFirst({
      where: { projectId: project.id, status: "ACCEPTED" },
      select: { id: true }
    });
    if (acceptedAfterLock) return null;

    const created = await tx.providerWorkProposal.create({
      data: {
        workId,
        projectId: project.id,
        providerId,
        ...parsed.data,
        attachments: [],
        evidenceUrls: []
      },
      select: { id: true, title: true, createdAt: true }
    });

    await tx.projectNegotiationMessage.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        body: "已提交结构化合作方案《" + parsed.data.title + "》。报价：" +
          parsed.data.estimatedPrice + "；周期：" + parsed.data.estimatedTime +
          "；起订要求：" + parsed.data.moq + "。"
      }
    });

    return created;
  });

  if (!proposal) {
    return NextResponse.json({ message: "方案刚刚已被确认，请刷新查看最新状态。" }, { status: 409 });
  }

  await createNotificationSafe({
    recipientId: project.ownerUserId ?? project.designerId ?? project.projectIntake?.ownerId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: "服务商提交了合作方案",
    body: project.title + " 已收到可确认的报价与交付条件。",
    targetUrl: "/me/projects/collaboration/" + project.id,
    dedupe: false
  });

  revalidatePath("/me/projects/collaboration/" + project.id);
  revalidatePath("/me/projects");
  return NextResponse.json({ message: "合作方案已提交。", item: proposal }, { status: 201 });
}
