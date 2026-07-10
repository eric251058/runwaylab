import {
  ChallengeStatus,
  IncubationApplicationStatus,
  IncubationStatus,
  UserRole,
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
  school: true,
  teacher: true,
  teacherRecommendations: {
    take: 1
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
  },
  workIncubation: true,
  _count: {
    select: {
      presaleIntents: true,
      fabricProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true,
      presaleCampaigns: true,
      fabricRecommendations: true,
      providerWorkProposals: true
    }
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

export type WorkCardInteractionState = {
  likedByCurrentUser: boolean;
  favoritedByCurrentUser: boolean;
};

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

export type WorkSort = "latest" | "popular";
export type WorkFilter = "newcomer" | "editor" | "incubatable" | "cooperation" | "ai" | "graduation";

const workFilterWhere: Record<WorkFilter, Prisma.WorkWhereInput> = {
  newcomer: {
    user: {
      role: {
        in: [UserRole.STUDENT_DESIGNER, UserRole.NEW_DESIGNER]
      }
    }
  },
  editor: {
    isEditorPick: true
  },
  incubatable: {
    OR: [
      { wantsIncubation: true },
      { incubationStatus: { not: null } },
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
  cooperation: {
    isOpenCoop: true
  },
  ai: {
    isAiAssisted: true
  },
  graduation: {
    OR: [{ workType: { contains: "毕业" } }, { category: { contains: "毕业" } }, { styleTags: { has: "毕业设计" } }]
  }
};

function getApprovedWorksWhere(filter?: WorkFilter): Prisma.WorkWhereInput {
  return filter
    ? {
        AND: [approvedVisibleWorkWhere, workFilterWhere[filter]]
      }
    : approvedVisibleWorkWhere;
}

export function getApprovedWorks(options: { take?: number; sort?: WorkSort; filter?: WorkFilter } = {}) {
  const { take = 30, sort = "latest", filter } = options;

  return prisma.work.findMany({
    where: getApprovedWorksWhere(filter),
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

export async function attachWorkCardInteractionState<T extends { id: string }>(
  works: T[],
  userId?: string | null
): Promise<Array<T & WorkCardInteractionState>> {
  if (!works.length) return [];

  if (!userId) {
    return works.map((work) => ({
      ...work,
      likedByCurrentUser: false,
      favoritedByCurrentUser: false
    }));
  }

  const workIds = works.map((work) => work.id);
  const [likes, favorites] = await Promise.all([
    prisma.like.findMany({
      where: {
        userId,
        workId: {
          in: workIds
        }
      },
      select: {
        workId: true
      }
    }),
    prisma.favorite.findMany({
      where: {
        userId,
        workId: {
          in: workIds
        }
      },
      select: {
        workId: true
      }
    })
  ]);

  const likedIds = new Set(likes.map((item) => item.workId));
  const favoritedIds = new Set(favorites.map((item) => item.workId));

  return works.map((work) => ({
    ...work,
    likedByCurrentUser: likedIds.has(work.id),
    favoritedByCurrentUser: favoritedIds.has(work.id)
  }));
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

export function getWorkDetailById(id: string) {
  return prisma.work.findUnique({
    where: {
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
