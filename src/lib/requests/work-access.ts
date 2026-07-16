import { prisma } from "@/lib/prisma";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

export async function getRequestableWork(workId: string | null | undefined, userId: string) {
  if (!workId) {
    return null;
  }

  const work = await prisma.work.findFirst({
    where: {
      id: workId,
      OR: [{ userId }, publicWorkWhere]
    },
    select: {
      ...publicQualityWorkCheckSelect,
      userId: true
    }
  });

  if (!work) return null;
  if (work.userId !== userId && !isPublicWorkAccessible(work)) return null;

  return {
    id: work.id,
    title: work.title
  };
}
