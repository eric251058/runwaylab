import { NotificationType, type Fabric, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export {
  FABRIC_RECOMMENDATION_STATUS_LABELS,
  recommendationConditionText,
  responseTimeOptions,
  sampleAvailabilityOptions
} from "@/lib/fabric-recommendation-shared";

type ReasonFabric = Pick<Fabric, "composition" | "texture" | "usage" | "weight" | "season">;

export function generateFabricRecommendationReason({
  workCategory,
  styleTags,
  fabric
}: {
  workCategory?: string | null;
  styleTags?: string[] | null;
  fabric: ReasonFabric;
}) {
  const texture = fabric.texture ? `具有${fabric.texture}特点` : null;
  const composition = fabric.composition ? `成分为${fabric.composition}` : null;
  const usage = fabric.usage ? `适用于${fabric.usage}` : workCategory ? `可用于${workCategory}` : null;
  const weight = fabric.weight ? `克重 ${fabric.weight}` : null;
  const season = fabric.season ? `适合${fabric.season}` : null;
  const style = styleTags?.[0] ? `和作品的${styleTags[0]}风格相匹配` : "适合作为该作品的材料方向参考";
  const details = [texture, composition, usage, weight, season].filter(Boolean).slice(0, 3).join("，");

  return details
    ? `这款面料${details}，${style}。建议先确认实物手感和颜色后用于主体结构或局部拼接。`
    : "这款面料适合作为该作品的材料方向参考，建议先确认实物手感、颜色和克重后再推进打样。";
}

export function recommendationInclude() {
  return {
    work: {
      select: {
        id: true,
        title: true,
        userId: true,
        images: {
          orderBy: { sortOrder: "asc" as const },
          take: 1
        }
      }
    },
    fabric: true,
    provider: true,
    createdBy: {
      select: {
        id: true,
        nickname: true
      }
    }
  } satisfies Prisma.WorkFabricRecommendationInclude;
}

export async function createNotificationSafe({
  userId,
  title,
  content,
  linkUrl
}: {
  userId?: string | null;
  title: string;
  content: string;
  linkUrl?: string;
}) {
  if (!userId) return;

  await prisma.notification
    .create({
      data: {
        userId,
        type: NotificationType.REQUEST_HANDLED,
        title,
        content,
        linkUrl
      }
    })
    .catch((error) => {
      console.error("Notification creation failed", {
        errorType: error instanceof Error ? error.name : typeof error
      });
    });
}
