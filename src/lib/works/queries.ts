import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere, publicChallengeEntryWhere } from "@/lib/works/rules";

export function getApprovedVisibleWorks(take = 24) {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      user: {
        include: {
          designerProfile: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take
  });
}

export function getApprovedVisibleWorkById(id: string) {
  return prisma.work.findFirst({
    where: {
      ...approvedVisibleWorkWhere,
      id
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      user: {
        include: {
          designerProfile: true
        }
      }
    }
  });
}

export function getPublicChallengeEntries(challengeId: string) {
  return prisma.challengeEntry.findMany({
    where: {
      ...publicChallengeEntryWhere,
      challengeId
    },
    include: {
      work: {
        include: {
          images: {
            orderBy: {
              sortOrder: "asc"
            }
          },
          user: true
        }
      }
    }
  });
}
