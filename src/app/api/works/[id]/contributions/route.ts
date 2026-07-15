import { NextResponse } from "next/server";
import { ContributionPersona, ContributionType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getContributionActorKey } from "@/lib/contribution-actor";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { cleanPlainText } from "@/lib/user-contributions";
import { publicWorkWhere } from "@/lib/works/public";

const contributionSchema = z.object({
  persona: z.nativeEnum(ContributionPersona),
  type: z.nativeEnum(ContributionType),
  content: z.string(),
  name: z.string().trim().max(100).optional().nullable(),
  contact: z.string().trim().max(100).optional().nullable(),
  website: z.string().optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const limitKey = user?.id ? `contribution:user:${user.id}:1m` : `contribution:ip:${getClientIp(request)}:1m`;
  const limit = checkRateLimit(limitKey, { windowMs: 60 * 1000, limit: 5 });

  if (limit.limited) {
    return tooManyRequests("提交较频繁，请稍后再试。", limit.retryAfter);
  }

  const parsed = contributionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "建议内容不能为空，且不能超过 1000 字。" }, { status: 400 });
  }

  if (cleanPlainText(parsed.data.website, 100)) {
    return NextResponse.json({
      message: "感谢你的建议。平台会根据有效反馈推进作品孵化。"
    }, { status: 201 });
  }

  const content = cleanPlainText(parsed.data.content, 1000);
  const name = cleanPlainText(parsed.data.name, 100) || null;
  const contact = cleanPlainText(parsed.data.contact, 100) || null;

  if (content.length < 8) {
    return NextResponse.json({ message: "建议内容请至少填写 8 个字。" }, { status: 400 });
  }

  const work = await prisma.work.findFirst({
    where: {
      id,
      ...publicWorkWhere
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在或暂不可提交建议。" }, { status: 404 });
  }

  const actorKey = await getContributionActorKey(user);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [workContributionCount, globalContributionCount] = await Promise.all([
    prisma.workContribution.count({
      where: {
        actorKey,
        workId: id,
        createdAt: {
          gte: since
        }
      }
    }),
    prisma.workContribution.count({
      where: {
        actorKey,
        createdAt: {
          gte: since
        }
      }
    })
  ]);

  if (workContributionCount >= 3 || globalContributionCount >= 10) {
    return NextResponse.json({ message: "提交较频繁，请稍后再试。" }, { status: 429 });
  }

  await prisma.workContribution.create({
    data: {
      workId: id,
      actorKey,
      persona: parsed.data.persona,
      type: parsed.data.type,
      content,
      name,
      contact
    }
  });

  return NextResponse.json({
    message: "感谢你的建议。平台会根据有效反馈推进作品孵化。"
  }, { status: 201 });
}
