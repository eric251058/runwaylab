import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ProviderAvailabilityStatus, ProviderWorkProposalStatus, ProviderWorkProposalType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { apiError, forbidden, tooManyRequests, unauthenticated } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

const proposalSchema = z.object({
  recommendationType: z.enum(["FABRIC", "SAMPLE", "PRODUCTION", "ACCESSORY", "PROCESS"]).optional().default("SAMPLE"),
  productName: z.string().trim().max(120).optional().nullable(),
  reason: z.string().trim().max(600).optional().nullable(),
  priceRange: z.string().trim().max(120).optional().nullable(),
  moq: z.string().trim().max(80).optional().nullable(),
  leadTime: z.string().trim().max(80).optional().nullable(),
  showcaseItemId: z.string().trim().optional().nullable(),
  message: z.string().trim().max(600).optional().nullable(),
  estimatedTime: z.string().trim().max(80).optional().nullable(),
  quantity: z.string().trim().max(80).optional().nullable()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function proposalType(value: string) {
  if (value === "FABRIC") return ProviderWorkProposalType.FABRIC;
  if (value === "SAMPLE") return ProviderWorkProposalType.SAMPLE;
  if (value === "PRODUCTION") return ProviderWorkProposalType.PRODUCTION;
  return ProviderWorkProposalType.OTHER;
}

function typeLabel(value: string) {
  if (value === "FABRIC") return "推荐面料";
  if (value === "SAMPLE") return "提供打样";
  if (value === "PRODUCTION") return "提供生产";
  if (value === "ACCESSORY") return "推荐辅料";
  return "提供工艺建议";
}

export async function POST(request: Request, context: RouteContext) {
  const { id: workId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return unauthenticated("请先登录后再推荐服务。");

  const provider = await getProviderForUser(user);
  if (!provider || !provider.opportunityVisible || provider.availabilityStatus === ProviderAvailabilityStatus.PAUSED) {
    return forbidden("当前账号还不能推荐服务，请先完成服务商主页创建。");
  }

  const limit = checkRateLimit(`provider-work-proposal:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return tooManyRequests("提交过于频繁，请稍后再试。", limit.retryAfter);

  const parsed = proposalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "请检查推荐内容。", 422);

  const content = parsed.data.reason || parsed.data.message || "";
  if (content.trim().length < 1) return apiError("请填写一句话说明。", 422);

  const work = await prisma.work.findFirst({
    where: { id: workId, ...publicWorkWhere },
    select: { ...publicQualityWorkCheckSelect, title: true, userId: true }
  });

  if (!isPublicWorkAccessible(work)) return apiError("作品不存在或暂不可提交推荐。", 404);
  if (work.userId === user.id) return forbidden("不能给自己的作品提交服务推荐。");

  let showcaseId: string | null = null;
  if (parsed.data.showcaseItemId) {
    const showcase = await prisma.providerShowcaseItem.findFirst({
      where: { id: parsed.data.showcaseItemId, providerId: provider.id },
      select: { id: true }
    });
    if (!showcase) return apiError("选择的案例不属于当前服务商。", 403);
    showcaseId = showcase.id;
  }

  const sameWorkCount = await prisma.providerWorkProposal.count({
    where: {
      workId,
      providerId: provider.id,
      status: ProviderWorkProposalStatus.PENDING
    }
  });
  if (sameWorkCount >= 5) return apiError("这个作品已有待处理推荐，请等待设计师查看。", 409);

  const type = proposalType(parsed.data.recommendationType);
  const title = parsed.data.productName?.trim() || `${provider.name} ${typeLabel(parsed.data.recommendationType)}`;
  const proposal = await prisma.providerWorkProposal.create({
    data: {
      workId,
      providerId: provider.id,
      type,
      title,
      summary: content.trim(),
      description: content.trim(),
      estimatedPrice: parsed.data.priceRange || null,
      estimatedTime: parsed.data.leadTime || parsed.data.estimatedTime || null,
      moq: parsed.data.moq || parsed.data.quantity || null,
      attachments: showcaseId ? [showcaseId] : []
    },
    select: { id: true }
  });

  await createNotificationSafe({
    userId: work.userId,
    title: "有服务商推荐产品或服务",
    content: `${provider.name} 向作品《${work.title}》提交了${typeLabel(parsed.data.recommendationType)}。`,
    linkUrl: `/works/${work.id}`
  });

  revalidatePath(`/works/${work.id}`);
  revalidatePath("/me/incubation");
  revalidatePath("/provider-center/recommendations");
  revalidatePath("/provider-center");

  return NextResponse.json({ message: "推荐已提交，等待设计师查看。", proposal }, { status: 201 });
}
