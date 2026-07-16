import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FabricStatus, Prisma, ProviderAvailabilityStatus, ProviderType, RecommendationStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { apiError, forbidden, tooManyRequests, unauthenticated } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { publicWorkWhere } from "@/lib/works/public";

const recommendationSchema = z.object({
  fabricId: z.string().trim().min(1),
  reason: z.string().trim().min(10).max(300),
  sampleAvailability: z.enum(["可寄样", "暂不寄样", "需确认"]).optional().nullable(),
  moqText: z.string().trim().max(80).optional().nullable(),
  responseTime: z.enum(["当天", "1 个工作日", "3 个工作日内"]).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function providerCanRecommend(provider: Awaited<ReturnType<typeof getProviderForUser>>) {
  return Boolean(
    provider &&
      provider.type === ProviderType.FABRIC_SUPPLIER &&
      provider.opportunityVisible &&
      provider.availabilityStatus !== ProviderAvailabilityStatus.PAUSED
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id: workId } = await context.params;
  const user = await getCurrentUser();

  if (!user) return unauthenticated("请先登录后再推荐面料。");

  const provider = await getProviderForUser(user);
  if (!providerCanRecommend(provider)) {
    return forbidden("当前账号还不能推荐面料，请先完成面料商入驻和资料审核。");
  }

  const limit = checkRateLimit(`fabric-recommendation:user:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return tooManyRequests("提交过于频繁，请稍后再试。", limit.retryAfter);

  const parsed = recommendationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("请确认面料、推荐理由和合作条件填写正确。", 400);
  }

  const work = await prisma.work.findFirst({
    where: {
      id: workId,
      ...publicWorkWhere
    },
    select: {
      id: true,
      title: true,
      userId: true
    }
  });

  if (!work) return apiError("作品不存在或暂不可推荐。", 404);
  if (work.userId === user.id) return forbidden("不能给自己的作品推荐产品。");

  const fabric = await prisma.fabric.findFirst({
    where: {
      id: parsed.data.fabricId,
      providerId: provider!.id,
      status: FabricStatus.ACTIVE
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!fabric) return forbidden("你只能推荐自己产品库中已公开的面料。");

  const [existing, providerTotal, providerRecent] = await Promise.all([
    prisma.workFabricRecommendation.findUnique({
      where: {
        workId_fabricId: {
          workId,
          fabricId: fabric.id
        }
      },
      select: { id: true }
    }),
    prisma.workFabricRecommendation.count({
      where: {
        workId,
        providerId: provider!.id,
        status: { not: RecommendationStatus.WITHDRAWN }
      }
    }),
    prisma.workFabricRecommendation.count({
      where: {
        workId,
        providerId: provider!.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  if (existing) return apiError("这款产品已经推荐过了。", 409);
  if (providerTotal >= 3) return apiError("这个作品最多可以推荐 3 款产品。", 409);
  if (providerRecent >= 3) return tooManyRequests("这个作品 24 小时内最多可以推荐 3 款产品。", 24 * 60 * 60);

  try {
    const recommendation = await prisma.workFabricRecommendation.create({
      data: {
        workId,
        fabricId: fabric.id,
        providerId: provider!.id,
        createdByUserId: user.id,
        recommendedBy: provider!.name,
        reason: parsed.data.reason,
        sampleAvailability: parsed.data.sampleAvailability ?? null,
        moqText: parsed.data.moqText || null,
        responseTime: parsed.data.responseTime ?? null,
        status: RecommendationStatus.PENDING
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    await createNotificationSafe({
      userId: work.userId,
      title: "有服务商推荐面料",
      content: `${provider!.name} 向作品《${work.title}》推荐了面料「${fabric.name}」。`,
      linkUrl: `/works/${work.id}`
    });

    revalidatePath(`/works/${work.id}`);
    revalidatePath("/provider-center/recommendations");
    revalidatePath("/me/incubation");

    return NextResponse.json({ message: "推荐已提交，等待设计师查看。", recommendation }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("这款产品已经推荐过了。", 409);
    }

    console.error("Fabric recommendation creation failed", {
      errorType: error instanceof Error ? error.name : typeof error
    });
    return apiError("推荐暂时提交失败，请稍后再试。", 500);
  }
}
