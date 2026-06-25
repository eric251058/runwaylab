import { ContentStatus, ReviewStatus } from "@prisma/client";

export const publicWorkWhere = {
  reviewStatus: ReviewStatus.APPROVED,
  contentStatus: ContentStatus.VISIBLE
} as const;
