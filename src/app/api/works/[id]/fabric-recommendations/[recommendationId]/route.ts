import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ProviderType, RecommendationStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";
import { apiError, forbidden, unauthenticated } from "@/lib/security/api-response";

const statusSchema = z.object({
  action: z.enum(["INTERESTED", "NOT_SUITABLE", "WITHDRAWN"])
});

type RouteContext = {
  params: Promise<{
    id: string;
    recommendationId: string;
  }>;
};

function statusCopy(status: RecommendationStatus) {
  if (status === RecommendationStatus.INTERESTED || status === RecommendationStatus.ACCEPTED) {
    return {
      message: "已标记为感兴趣。",
      title: "设计师对面料推荐感兴趣",
      content: "设计师对你推荐的面料感兴趣，可以等待平台或设计师后续联系。"
    };
  }

  return {
    message: "已标记为暂不合适。",
    title: "设计师已处理面料推荐",
    content: "设计师认为这款面料暂时不适合当前作品。"
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthenticated("请先登录后再处理推荐。");

  const { id: workId, recommendationId } = await context.params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return apiError("状态操作不正确。", 400);

  const recommendation = await prisma.workFabricRecommendation.findFirst({
    where: {
      id: recommendationId,
      workId
    },
    include: {
      work: {
        select: {
          id: true,
          title: true,
          userId: true
        }
      },
      fabric: {
        select: {
          name: true
        }
      },
      provider: {
        select: {
          id: true,
          name: true,
          ownerId: true
        }
      }
    }
  });

  if (!recommendation) return apiError("推荐不存在或已不可处理。", 404);

  if (parsed.data.action === "WITHDRAWN") {
    const provider = await getProviderForUser(user);
    if (!provider || provider.type !== ProviderType.FABRIC_SUPPLIER || provider.id !== recommendation.providerId) {
      return forbidden("只能撤回自己服务商账号提交的推荐。");
    }

    if (recommendation.status !== RecommendationStatus.PENDING) {
      return apiError("已处理的推荐不能撤回。", 409);
    }

    await prisma.workFabricRecommendation.update({
      where: { id: recommendation.id },
      data: { status: RecommendationStatus.WITHDRAWN }
    });

    revalidatePath(`/works/${workId}`);
    revalidatePath("/provider-center/recommendations");
    revalidatePath("/me/incubation");

    return NextResponse.json({ message: "推荐已撤回。" });
  }

  if (recommendation.work.userId !== user.id) {
    return forbidden("只有作品作者可以处理面料推荐。");
  }

  if (recommendation.status !== RecommendationStatus.PENDING) {
    return apiError("这条推荐已经处理过。", 409);
  }

  const nextStatus = parsed.data.action === "INTERESTED" ? RecommendationStatus.INTERESTED : RecommendationStatus.NOT_SUITABLE;
  const copy = statusCopy(nextStatus);

  await prisma.workFabricRecommendation.update({
    where: { id: recommendation.id },
    data: { status: nextStatus }
  });

  await createNotificationSafe({
    userId: recommendation.createdByUserId ?? recommendation.provider?.ownerId,
    title: copy.title,
    content: `${copy.content} 作品：《${recommendation.work.title}》，面料：${recommendation.fabric.name}。`,
    linkUrl: "/provider-center/recommendations"
  });

  revalidatePath(`/works/${workId}`);
  revalidatePath("/provider-center/recommendations");
  revalidatePath("/me/incubation");

  return NextResponse.json({ message: copy.message, status: nextStatus });
}
