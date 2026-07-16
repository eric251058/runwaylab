import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ProviderAvailabilityStatus, ProviderType, ProviderWorkProposalStatus, ProviderWorkProposalType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { apiError, forbidden, tooManyRequests, unauthenticated } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

const proposalSchema = z.object({
  showcaseItemId: z.string().trim().optional().nullable(),
  message: z.string().trim().min(10).max(600),
  estimatedTime: z.string().trim().max(80).optional().nullable(),
  quantity: z.string().trim().max(80).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function proposalType(type: ProviderType) {
  if (type === ProviderType.SAMPLE_STUDIO) return ProviderWorkProposalType.SAMPLE;
  if (type === ProviderType.FACTORY) return ProviderWorkProposalType.PRODUCTION;
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  const { id: workId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return unauthenticated("请先登录后再提交支持方案。");

  const provider = await getProviderForUser(user);
  const type = provider ? proposalType(provider.type) : null;
  if (!provider || !type || !provider.opportunityVisible || provider.availabilityStatus === ProviderAvailabilityStatus.PAUSED) {
    return forbidden("当前账号还不能提交打样或生产支持，请先完成对应服务商入驻和审核。");
  }

  const limit = checkRateLimit(`provider-work-proposal:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return tooManyRequests("提交过于频繁，请稍后再试。", limit.retryAfter);

  const parsed = proposalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "请检查提交内容。", 400);

  const work = await prisma.work.findFirst({
    where: {
      id: workId,
      ...publicWorkWhere
    },
    select: {
      ...publicQualityWorkCheckSelect,
      title: true,
      userId: true
    }
  });

  if (!isPublicWorkAccessible(work)) return apiError("作品不存在或暂不可提交支持方案。", 404);
  if (work.userId === user.id) return forbidden("不能给自己的作品提交支持方案。");

  let showcaseId: string | null = null;
  if (parsed.data.showcaseItemId) {
    const showcase = await prisma.providerShowcaseItem.findFirst({
      where: {
        id: parsed.data.showcaseItemId,
        providerId: provider.id
      },
      select: { id: true }
    });
    if (!showcase) return apiError("选择的案例不属于当前服务商。", 400);
    showcaseId = showcase.id;
  }

  const sameWorkCount = await prisma.providerWorkProposal.count({
    where: {
      workId,
      providerId: provider.id,
      type,
      status: ProviderWorkProposalStatus.PENDING
    }
  });
  if (sameWorkCount >= 3) return apiError("这个作品已有待处理支持方案，请等待设计师查看。", 409);

  const title = provider.type === ProviderType.FACTORY ? `${provider.name} 提供生产支持` : `${provider.name} 提供打样支持`;
  const proposal = await prisma.providerWorkProposal.create({
    data: {
      workId,
      providerId: provider.id,
      type,
      title,
      description: parsed.data.message,
      estimatedTime: parsed.data.estimatedTime || null,
      moq: parsed.data.quantity || null,
      attachments: showcaseId ? [showcaseId] : []
    },
    select: {
      id: true
    }
  });

  await createNotificationSafe({
    userId: work.userId,
    title: provider.type === ProviderType.FACTORY ? "有工厂提交生产支持" : "有打样工作室提交支持",
    content: `${provider.name} 向作品《${work.title}》提交了支持方案。`,
    linkUrl: `/works/${work.id}`
  });

  revalidatePath(`/works/${work.id}`);
  revalidatePath("/me/incubation");
  revalidatePath("/provider-center");

  return NextResponse.json({ message: "支持方案已提交，等待设计师查看。", proposal }, { status: 201 });
}
