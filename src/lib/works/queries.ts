import {
  ChallengeStatus,
  IncubationApplicationStatus,
  IncubationStatus,
  UserRole,
  type Prisma
} from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { approvedVisibleWorkWhere, isPublicQualityWork, publicQualityWorkWhere } from "@/lib/works/rules";

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
        AND: [publicQualityWorkWhere, workFilterWhere[filter]]
      }
    : publicQualityWorkWhere;
}

export const getPublicQualityWorkIds = cache(async () => {
  const works = await prisma.work.findMany({
    where: publicQualityWorkWhere,
    select: {
      id: true,
      title: true,
      description: true,
      reviewStatus: true,
      contentStatus: true,
      images: {
        select: {
          imageUrl: true
        }
      }
    }
  });

  return works.filter(isPublicQualityWork).map((work) => work.id);
});

export async function getApprovedWorks(options: { take?: number; sort?: WorkSort; filter?: WorkFilter } = {}) {
  const { take = 30, sort = "latest", filter } = options;

  const works = await prisma.work.findMany({
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
    take: Math.min(take * 3, 120)
  });

  return works.filter(isPublicQualityWork).slice(0, take);
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

export async function getFeaturedWorks(take = 8) {
  const works = await prisma.work.findMany({
    where: {
      ...publicQualityWorkWhere,
      isFeatured: true
    },
    include: workCardInclude,
    orderBy: [{ createdAt: "desc" }],
    take: Math.min(take * 3, 60)
  });
  return works.filter(isPublicQualityWork).slice(0, take);
}

export async function getEditorPickWorks(take = 8) {
  const works = await prisma.work.findMany({
    where: {
      ...publicQualityWorkWhere,
      isEditorPick: true
    },
    include: workCardInclude,
    orderBy: [{ createdAt: "desc" }],
    take: Math.min(take * 3, 60)
  });
  return works.filter(isPublicQualityWork).slice(0, take);
}

export async function getPopularWorks(take = 10) {
  const works = await prisma.work.findMany({
    where: publicQualityWorkWhere,
    include: workCardInclude,
    orderBy: [
      { likeCount: "desc" },
      { favoriteCount: "desc" },
      { commentCount: "desc" },
      { shareCount: "desc" },
      { createdAt: "desc" }
    ],
    take: Math.min(take * 3, 80)
  });
  return works.filter(isPublicQualityWork).slice(0, take);
}

export async function getIncubationRecommendedWorks(take = 10) {
  const works = await prisma.work.findMany({
    where: publicQualityWorkWhere,
    include: workCardInclude,
    orderBy: [{ incubationRecommendCount: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
    take: Math.min(take * 3, 80)
  });
  return works.filter(isPublicQualityWork).slice(0, take);
}

export async function getIncubationCandidateWorks(take = 8) {
  const works = await prisma.work.findMany({
    where: {
      ...publicQualityWorkWhere,
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
    take: Math.min(take * 3, 60)
  });
  return works.filter(isPublicQualityWork).slice(0, take);
}

export async function getWorkById(id: string) {
  const work = await prisma.work.findFirst({
    where: {
      ...approvedVisibleWorkWhere,
      id
    },
    include: workDetailInclude
  });

  return work && isPublicQualityWork(work) ? work : null;
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

export async function getRecommendedDesigners(take = 6) {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return [];

  return prisma.designerProfile.findMany({
    where: {
      user: {
        works: {
          some: {
            id: {
              in: qualityWorkIds
            }
          }
        }
      }
    },
    include: {
      user: {
        include: {
          _count: {
            select: {
              works: {
                where: {
                  id: {
                    in: qualityWorkIds
                  }
                }
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

export async function getIncubationProjects(take = 8) {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return [];

  const projects = await prisma.incubationProject.findMany({
    where: {
      workId: {
        in: qualityWorkIds
      }
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

  return projects.filter((project) => isPublicQualityWork(project.work));
}

export async function getChallengeEntryCount(challengeId: string) {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return 0;

  return prisma.challengeEntry.count({
    where: {
      challengeId,
      workId: {
        in: qualityWorkIds
      }
    }
  });
}

export async function getPublicChallengeEntries(challengeId: string) {
  const qualityWorkIds = await getPublicQualityWorkIds();
  if (!qualityWorkIds.length) return [];

  const entries = await prisma.challengeEntry.findMany({
    where: {
      challengeId,
      workId: {
        in: qualityWorkIds
      }
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
  return entries.filter((entry) => isPublicQualityWork(entry.work));
}

export const getApprovedVisibleWorks = (take = 24) => getApprovedWorks({ take });
export const getApprovedVisibleWorkById = getWorkById;
