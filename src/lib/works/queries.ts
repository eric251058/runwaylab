import {
  ChallengeStatus,
  IncubationApplicationStatus,
  IncubationStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere, publicChallengeEntryWhere } from "@/lib/works/rules";

const workCardInclude = {
  images: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  user: {
    include: {
      designerProfile: true
    }
  },
  challengeEntries: {
    include: {
      challenge: true
    },
    take: 1
  },
  incubationProjects: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  },
  incubationApplications: {
    where: {
      status: {
        in: [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING]
      }
    },
    take: 1
  }
} satisfies Prisma.WorkInclude;

const workDetailInclude = {
  images: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  user: {
    include: {
      designerProfile: true
    }
  },
  challengeEntries: {
    include: {
      challenge: true
    }
  },
  incubationApplications: {
    orderBy: {
      createdAt: "desc"
    },
    take: 3
  },
  incubationProjects: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  },
  comments: {
    where: {
      status: "VISIBLE"
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 6
  }
} satisfies Prisma.WorkInclude;

export type WorkCardData = Prisma.WorkGetPayload<{ include: typeof workCardInclude }>;
export type WorkDetailData = Prisma.WorkGetPayload<{ include: typeof workDetailInclude }>;
export type ChallengeEntryData = Awaited<ReturnType<typeof getPublicChallengeEntries>>[number];
export type IncubationProjectData = Awaited<ReturnType<typeof getIncubationProjects>>[number];

export type RecommendedDesigner = Prisma.DesignerProfileGetPayload<{
  include: {
    user: {
      include: {
        _count: {
          select: {
            works: true;
          };
        };
      };
    };
  };
}>;

type WorkSort = "latest" | "popular";

export function getApprovedWorks(options: { take?: number; sort?: WorkSort } = {}) {
  const { take = 30, sort = "latest" } = options;

  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workCardInclude,
    orderBy:
      sort === "popular"
        ? [
            { likeCount: "desc" },
            { favoriteCount: "desc" },
            { commentCount: "desc" },
            { shareCount: "desc" },
            { createdAt: "desc" }
          ]
        : [{ createdAt: "desc" }],
    take
  });
}

export function getFeaturedWorks(take = 8) {
  return prisma.work.findMany({
    where: {
      ...approvedVisibleWorkWhere,
      isFeatured: true
    },
    include: workCardInclude,
    orderBy: [{ createdAt: "desc" }],
    take
  });
}

export function getEditorPickWorks(take = 8) {
  return prisma.work.findMany({
    where: {
      ...approvedVisibleWorkWhere,
      isEditorPick: true
    },
    include: workCardInclude,
    orderBy: [{ createdAt: "desc" }],
    take
  });
}

export function getPopularWorks(take = 10) {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workCardInclude,
    orderBy: [
      { likeCount: "desc" },
      { favoriteCount: "desc" },
      { commentCount: "desc" },
      { shareCount: "desc" },
      { createdAt: "desc" }
    ],
    take
  });
}

export function getIncubationRecommendedWorks(take = 10) {
  return prisma.work.findMany({
    where: approvedVisibleWorkWhere,
    include: workCardInclude,
    orderBy: [{ incubationRecommendCount: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
    take
  });
}

export function getIncubationCandidateWorks(take = 8) {
  return prisma.work.findMany({
    where: {
      ...approvedVisibleWorkWhere,
      OR: [
        { incubationStatus: IncubationStatus.CANDIDATE },
        {
          incubationApplications: {
            some: {
              status: {
                in: [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING]
              }
            }
          }
        }
      ]
    },
    include: workCardInclude,
    orderBy: [{ incubationRecommendCount: "desc" }, { createdAt: "desc" }],
    take
  });
}

export function getWorkById(id: string) {
  return prisma.work.findFirst({
    where: {
      ...approvedVisibleWorkWhere,
      id
    },
    include: workDetailInclude
  });
}

export async function getActiveChallenge() {
  const setting = await prisma.systemSetting.findUnique({
    where: {
      key: "active_challenge_id"
    }
  });

  if (setting?.value) {
    const challenge = await prisma.challenge.findUnique({
      where: {
        id: setting.value
      }
    });

    if (challenge) {
      return challenge;
    }
  }

  return prisma.challenge.findFirst({
    where: {
      status: ChallengeStatus.ACTIVE
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export function getChallengeById(id: string) {
  return prisma.challenge.findUnique({
    where: {
      id
    }
  });
}

export function getRecommendedDesigners(take = 6) {
  return prisma.designerProfile.findMany({
    include: {
      user: {
        include: {
          _count: {
            select: {
              works: {
                where: approvedVisibleWorkWhere
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    take
  });
}

export function getIncubationProjects(take = 8) {
  return prisma.incubationProject.findMany({
    where: {
      work: approvedVisibleWorkWhere
    },
    include: {
      work: {
        include: workCardInclude
      },
      designer: {
        include: {
          designerProfile: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take
  });
}

export function getChallengeEntryCount(challengeId: string) {
  return prisma.challengeEntry.count({
    where: {
      ...publicChallengeEntryWhere,
      challengeId
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
        include: workCardInclude
      },
      user: {
        include: {
          designerProfile: true
        }
      }
    },
    orderBy: [{ manualRank: "asc" }, { popularityScore: "desc" }, { incubationScore: "desc" }]
  });
}

export const getApprovedVisibleWorks = (take = 24) => getApprovedWorks({ take });
export const getApprovedVisibleWorkById = getWorkById;
