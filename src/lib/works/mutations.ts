import { ContentStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getActiveChallengeId() {
  const setting = await prisma.systemSetting.findUnique({
    where: {
      key: "active_challenge_id"
    }
  });

  if (setting?.value) {
    return setting.value;
  }

  const challenge = await prisma.challenge.findFirst({
    where: {
      status: "ACTIVE"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return challenge?.id ?? null;
}

export const pendingVisibleState = {
  reviewStatus: ReviewStatus.PENDING,
  contentStatus: ContentStatus.VISIBLE
} as const;
