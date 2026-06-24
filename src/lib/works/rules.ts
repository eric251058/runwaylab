import { ContentStatus, ReviewStatus, type Prisma } from "@prisma/client";

export const approvedVisibleWorkWhere: Prisma.WorkWhereInput = {
  reviewStatus: ReviewStatus.APPROVED,
  contentStatus: ContentStatus.VISIBLE
};

export const defaultNewWorkState = {
  reviewStatus: ReviewStatus.PENDING,
  contentStatus: ContentStatus.VISIBLE
} as const;

export const publicChallengeEntryWhere: Prisma.ChallengeEntryWhereInput = {
  work: approvedVisibleWorkWhere
};
