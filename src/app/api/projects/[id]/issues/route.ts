import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/features";
import { parseProjectIssueRequest } from "@/lib/projects/issues";
import { canViewProject } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) {
    return NextResponse.json({ error: "项目协作功能尚未开放。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit(`project-issue:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 8 });
  if (limit.limited) return NextResponse.json({ error: "提交太频繁，请稍后再试。" }, { status: 429 });

  const { id } = await context.params;
  const project = await prisma.collaborationProject.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { work: { select: { userId: true } } }
  });

  if (!project || !canViewProject(user, project)) {
    return NextResponse.json({ error: "项目不存在或暂不可见。" }, { status: 404 });
  }

  const parsed = parseProjectIssueRequest(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请检查异常信息。" }, { status: 400 });
  }

  const issue = await prisma.projectIssue.create({
    data: {
      projectId: project.id,
      reporterId: user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description || null
    }
  });

  return NextResponse.json({
    issue: {
      id: issue.id,
      projectId: issue.projectId,
      type: issue.type,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      createdAt: issue.createdAt
    }
  });
}
