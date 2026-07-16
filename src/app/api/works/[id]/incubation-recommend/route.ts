import { IncubationApplicationStatus, IncubationSource, IncubationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getCandidateThreshold() {
  const setting = await prisma.systemSetting.findUnique({
    where: {
      key: "incubation_candidate_threshold"
    }
  });
  const value = Number(setting?.value);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再推荐孵化。" }, { status: 401 });
  }

  const limit = checkRateLimit(`interaction:incubation-recommend:${user.id}:1m`, { windowMs: 60 * 1000, limit: 30 });
  if (limit.limited) return tooManyRequests("操作过于频繁，请稍后再试。", limit.retryAfter);

  const work = await prisma.work.findFirst({
    where: {
      id,
      ...publicWorkWhere
    },
    select: {
      ...publicQualityWorkCheckSelect,
      userId: true
    }
  });

  if (!isPublicWorkAccessible(work)) {
    return NextResponse.json({ message: "作品不存在或暂不可推荐。" }, { status: 404 });
  }

  const threshold = await getCandidateThreshold();

  const result = await prisma.$transaction(async (tx) => {
    const existed = await tx.incubationRecommendation.findUnique({
      where: {
        userId_workId: {
          userId: user.id,
          workId: id
        }
      }
    });

    if (existed) {
      const current = await tx.work.findUnique({
        where: { id },
        select: {
          incubationRecommendCount: true,
          incubationStatus: true
        }
      });
      return {
        recommended: true,
        alreadyRecommended: true,
        incubationRecommendCount: current?.incubationRecommendCount ?? 0,
        incubationStatus: current?.incubationStatus ?? null
      };
    }

    await tx.incubationRecommendation.create({
      data: {
        userId: user.id,
        workId: id
      }
    });

    const updated = await tx.work.update({
      where: { id },
      data: {
        incubationRecommendCount: {
          increment: 1
        }
      },
      select: {
        userId: true,
        incubationRecommendCount: true,
        incubationStatus: true
      }
    });

    if (updated.incubationRecommendCount >= threshold) {
      const existingApplication = await tx.incubationApplication.findFirst({
        where: {
          workId: id,
          status: {
            in: [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING]
          }
        }
      });

      if (!existingApplication) {
        await tx.incubationApplication.create({
          data: {
            userId: updated.userId,
            workId: id,
            source: IncubationSource.RECOMMEND_THRESHOLD,
            status: IncubationApplicationStatus.CANDIDATE,
            adminNote: `推荐孵化达到 ${threshold} 次，自动进入候选。`
          }
        });
      }

      const candidateWork = await tx.work.update({
        where: { id },
        data: {
          incubationStatus: IncubationStatus.CANDIDATE
        },
        select: {
          incubationRecommendCount: true,
          incubationStatus: true
        }
      });

      return {
        recommended: true,
        alreadyRecommended: false,
        incubationRecommendCount: candidateWork.incubationRecommendCount,
        incubationStatus: candidateWork.incubationStatus
      };
    }

    return {
      recommended: true,
      alreadyRecommended: false,
      incubationRecommendCount: updated.incubationRecommendCount,
      incubationStatus: updated.incubationStatus
    };
  });

  return NextResponse.json(result);
}
