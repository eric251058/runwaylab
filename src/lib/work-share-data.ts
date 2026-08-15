import { prisma } from "@/lib/prisma";
import { type WorkShareInfo } from "@/lib/work-share";
import { isPublicQualityWork, publicQualityWorkWhere } from "@/lib/works/rules";

export async function getPublicWorkShareInfo(workId: string): Promise<WorkShareInfo | null> {
  const work = await prisma.work.findFirst({
    where: {
      ...publicQualityWorkWhere,
      id: workId
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      styleTags: true,
      reviewStatus: true,
      contentStatus: true,
      visibility: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { imageUrl: true },
        take: 1
      },
      user: {
        select: {
          nickname: true,
          designerProfile: {
            select: {
              school: true,
              city: true
            }
          }
        }
      },
      school: {
        select: {
          name: true,
          city: true
        }
      }
    }
  });

  if (!work || !isPublicQualityWork(work)) return null;
  return {
    id: work.id,
    title: work.title,
    description: work.description,
    designerName: work.user.nickname,
    schoolName: work.school?.name ?? work.user.designerProfile?.school ?? null,
    city: work.school?.city ?? work.user.designerProfile?.city ?? null,
    imageUrl: work.images[0]?.imageUrl ?? null,
    styleTags: work.styleTags,
    category: work.category
  };
}
