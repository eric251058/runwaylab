import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { getPrivateCollaborationProjectForViewer } from "@/lib/private-collaboration-projects";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";

const messageSchema = z.object({
  body: z.string().trim().min(1, "请填写洽谈内容。").max(1200, "单条消息最多 1200 字。")
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit("project-negotiation-message:" + user.id + ":10m", {
    windowMs: 10 * 60 * 1000,
    limit: 30
  });
  if (limit.limited) return tooManyRequests("消息发送较频繁，请稍后再试。", limit.retryAfter);

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "请检查消息内容。" }, { status: 422 });
  }

  const { id } = await context.params;
  const project = await getPrivateCollaborationProjectForViewer(id, user);
  if (!project) return NextResponse.json({ message: "洽谈项目不存在或你无权访问。" }, { status: 404 });
  if (!project.providerId) return NextResponse.json({ message: "该项目尚未关联服务商。" }, { status: 409 });

  const message = await prisma.projectNegotiationMessage.create({
    data: { projectId: project.id, senderId: user.id, body: parsed.data.body },
    select: { id: true, createdAt: true }
  });

  const recipientId = project.provider?.ownerId === user.id
    ? project.ownerUserId ?? project.designerId
    : project.provider?.ownerId;

  await createNotificationSafe({
    recipientId,
    actorId: user.id,
    eventType: NOTIFICATION_EVENTS.PROVIDER_PROPOSAL_UPDATED,
    title: "洽谈项目有新消息",
    body: project.title + " 收到一条新的合作消息。",
    targetUrl: "/me/projects/collaboration/" + project.id,
    dedupe: false
  });

  revalidatePath("/me/projects/collaboration/" + project.id);
  revalidatePath("/me/projects");

  return NextResponse.json({ message: "消息已发送。", item: message }, { status: 201 });
}
