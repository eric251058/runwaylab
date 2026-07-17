import { NextResponse } from "next/server";
import { ProviderWorkProposalType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/features";
import { getProviderForUser } from "@/lib/provider-access";
import { canViewProject } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveInt(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function proposalType(value: unknown) {
  return typeof value === "string" && Object.values(ProviderWorkProposalType).includes(value as ProviderWorkProposalType)
    ? (value as ProviderWorkProposalType)
    : ProviderWorkProposalType.OTHER;
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.project_marketplace_v22"))) {
    return NextResponse.json({ error: "项目协作功能尚未开放。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const provider = await getProviderForUser(user);
  if (!provider) return NextResponse.json({ error: "请先完成服务商入驻或绑定。" }, { status: 403 });

  const limit = checkRateLimit(`project-proposal:${provider.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return NextResponse.json({ error: "提交太频繁，请稍后再试。" }, { status: 429 });

  const { id } = await context.params;
  const project = await prisma.collaborationProject.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { work: { select: { userId: true } } }
  });

  if (!project || !canViewProject(user, project)) {
    return NextResponse.json({ error: "项目不存在或暂不可见。" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = text(body?.title, 80);
  if (!title) return NextResponse.json({ error: "请填写方案标题。" }, { status: 400 });

  const proposal = await prisma.providerWorkProposal.create({
    data: {
      workId: project.workId,
      projectId: project.id,
      providerId: provider.id,
      type: proposalType(body?.type),
      title,
      summary: text(body?.summary, 160) || null,
      description: text(body?.description, 1200) || null,
      priceMin: positiveInt(body?.priceMin),
      priceMax: positiveInt(body?.priceMax),
      leadTimeDays: positiveInt(body?.leadTimeDays),
      minimumQuantity: positiveInt(body?.minimumQuantity)
    }
  });

  return NextResponse.json({ proposal });
}
