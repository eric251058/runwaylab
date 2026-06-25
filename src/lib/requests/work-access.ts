import { prisma } from "@/lib/prisma";
import { publicWorkWhere } from "@/lib/works/public";

export async function getRequestableWork(workId: string | null | undefined, userId: string) {
  if (!workId) {
    return null;
  }

  return prisma.work.findFirst({
    where: {
      id: workId,
      OR: [{ userId }, publicWorkWhere]
    },
    select: {
      id: true,
      title: true
    }
  });
}
