import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { getPrivateCollaborationProjectForViewer } from "@/lib/private-collaboration-projects";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const decisionSchema = z.object({
  action: z.enum(["ACCEPTED", "REVISION_REQUESTED", "REJECTED"]),
  note: z.string().trim().max(800).optional().default("")
}).superRefine((value, context) => {
  if (value.action === "REVISION_REQUESTED" && value.note.length < 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["note"],
      message: "请写明需要调整的内容。"
    });
  }
});

type RouteContext = {
  params: Promise<{ id: string; proposalId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit("private-project-proposal-decision:" + user.id + ":30m", {
    windowMs: 30 * 60 * 1000,
    limit: 12
  });
  if (limit.limited) return tooManyRequests("操作较频繁，请稍后再试。", limit.retryAfter);

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "请检查操作内容。" },
      { status: 422 }
    );
  }

  const { id, proposalId } = await context.params;
  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) {
    return NextResponse.json({ message: "洽谈项目不存在或你无权访问。" }, { status: 404 });
  }

  const canDecide = user.role === "ADMIN"
    || project.ownerUserId === user.id
    || project.designerId === user.id
    || project.projectIntake?.ownerId === user.id;
  if (!canDecide) {
    return NextResponse.json({ message: "只有项目方可以确认合作条件。" }, { status: 403 });
  }

  const proposal = await prisma.providerWorkProposal.findFirst({
    where: {
      id: proposalId,
      projectId: project.id,
      providerId: project.providerId ?? undefined
    }
  });
  if (!proposal) return NextResponse.json({ message: "合作方案不存在。" }, { status: 404 });
  if (proposal.status === "ACCEPTED") {
    return NextResponse.json({ message: "该方案已经确认。" }, { status: 409 });
  }
  if (proposal.status === "REJECTED") {
    return NextResponse.json({ message: "该方案已经关闭，请让服务商提交新版本。" }, { status: 409 });
  }

  const now = new Date();
  const deliveryDueAt = proposal.leadTimeDays
    ? new Date(now.getTime() + proposal.leadTimeDays * 24 * 60 * 60 * 1000)
    : null;
  const buyerId = project.ownerUserId ?? project.designerId ?? project.projectIntake?.ownerId;
  if (parsed.data.action === "ACCEPTED" && (!buyerId || !project.providerId)) return NextResponse.json({ message: "项目参与方信息不完整，暂时无法建立合作订单。" }, { status: 409 });

  const decisionApplied = await prisma.$transaction(async (tx) => {
    if (parsed.data.action === "ACCEPTED") {
      const existingAccepted = await tx.providerWorkProposal.findFirst({
        where: {
          projectId: project.id,
          status: "ACCEPTED",
          NOT: { id: proposal.id }
        },
        select: { id: true }
      });
      if (existingAccepted) return false;

      const claimed = await tx.providerWorkProposal.updateMany({
        where: {
          id: proposal.id,
          projectId: project.id,
          status: { in: ["PENDING", "SHORTLISTED"] }
        },
        data: { status: "ACCEPTED" }
      });
      if (claimed.count !== 1) return false;

      await tx.providerWorkProposal.updateMany({
        where: {
          projectId: project.id,
          id: { not: proposal.id },
          status: { in: ["PENDING", "SHORTLISTED"] }
        },
        data: { status: "REJECTED" }
      });
    await tx.projectOrder.create({
      data: {
        projectId: project.id,
        workId: project.workId,
        buyerId,
        providerId: project.providerId,
        title: proposal.title,
        quantity: proposal.minimumQuantity && proposal.minimumQuantity > 0 ? proposal.minimumQuantity : 1,
        quantityNote: proposal.moq,
        amountNote: proposal.estimatedPrice,
        deliveryNote: proposal.estimatedTime,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        fulfillmentStatus: "NOT_STARTED",
        note: proposal.summary,
        idempotencyKey: "private-project:" + project.id + ":proposal:" + proposal.id,
        termsVersion: "private-collaboration-v1",
        termsTextSnapshot: [proposal.summary, proposal.description, "报价：" + proposal.estimatedPrice, "周期：" + proposal.estimatedTime, "起订：" + proposal.moq].filter(Boolean).join("\n"),
        termsAcceptedAt: now,
        confirmedAt: now,
        confirmedById: user.id,
        confirmationChannel: "OTHER",
        confirmationEvidenceRef: "proposal:" + proposal.id,
        confirmationSummary: "双方在私密合作空间确认服务商方案。"
      }
    });
      await tx.projectMilestone.createMany({
        data: [
          {
            projectId: project.id,
            title: "合作方案确认",
            stage: "AGREEMENT",
            status: "COMPLETED",
            completedAt: now,
            note: "已确认方案《" + proposal.title + "》。",
            visibility: "PARTICIPANTS",
            createdByUserId: user.id
          },
          {
            projectId: project.id,
            title: "启动交付",
            stage: "DELIVERY_START",
            status: "TODO",
            note: "双方按已确认的报价、数量与周期启动执行。",
            visibility: "PARTICIPANTS",
            createdByUserId: user.id
          },
          {
            projectId: project.id,
            title: "交付与验收",
            stage: "DELIVERY_ACCEPTANCE",
            status: "TODO",
            dueAt: deliveryDueAt,
            note: "上传交付凭证并由项目方完成验收。",
            visibility: "PARTICIPANTS",
            createdByUserId: user.id
          }
        ]
      });
    } else {
      const claimed = await tx.providerWorkProposal.updateMany({
        where: {
          id: proposal.id,
          projectId: project.id,
          status: { in: ["PENDING", "SHORTLISTED"] }
        },
        data: { status: parsed.data.action === "REVISION_REQUESTED" ? "SHORTLISTED" : "REJECTED" }
      });
      if (claimed.count !== 1) return false;
    }

    const decisionText = parsed.data.action === "ACCEPTED"
      ? "项目方已确认合作方案《" + proposal.title + "》，项目进入执行准备。"
      : parsed.data.action === "REVISION_REQUESTED"
        ? "项目方要求调整合作方案《" + proposal.title + "》：" + parsed.data.note
        : "项目方未接受合作方案《" + proposal.title + "》。" +
          (parsed.data.note ? " 原因：" + parsed.data.note : "");

    await tx.projectNegotiationMessage.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        body: decisionText
      }
    });
    return true;
  });

  if (!decisionApplied) {
    return NextResponse.json({ message: "该方案已被处理，请刷新后查看最新状态。" }, { status: 409 });
  }

  await createNotificationSafe({
    recipientId: project.provider?.ownerId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: parsed.data.action === "ACCEPTED" ? "合作方案已确认" : "合作方案状态已更新",
    body: project.title + " 的项目方已处理你的合作方案。",
    targetUrl: "/me/projects/collaboration/" + project.id,
    dedupe: false
  });

  revalidatePath("/me/projects/collaboration/" + project.id);
  revalidatePath("/me/project-orders");
  revalidatePath("/me/projects");
  return NextResponse.json({
    message: parsed.data.action === "ACCEPTED"
      ? "方案已确认，合作订单与执行里程碑已建立。"
      : parsed.data.action === "REVISION_REQUESTED"
        ? "调整要求已发送。"
        : "方案已拒绝。"
  });
}
