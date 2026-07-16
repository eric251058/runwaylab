import { ContentStatus, ReviewStatus, type Prisma } from "@prisma/client";

export const approvedVisibleWorkWhere: Prisma.WorkWhereInput = {
  reviewStatus: ReviewStatus.APPROVED,
  contentStatus: ContentStatus.VISIBLE
};

export const publicQualityWorkWhere: Prisma.WorkWhereInput = {
  ...approvedVisibleWorkWhere,
  images: {
    some: {
      imageUrl: {
        not: ""
      }
    }
  }
};

export const defaultNewWorkState = {
  reviewStatus: ReviewStatus.PENDING,
  contentStatus: ContentStatus.VISIBLE
} as const;

export const publicChallengeEntryWhere: Prisma.ChallengeEntryWhereInput = {
  work: publicQualityWorkWhere
};

type PublicQualityWorkLike = {
  reviewStatus: string;
  contentStatus: string;
  title: string;
  description: string;
  images?: Array<{ imageUrl?: string | null }> | null;
};

function hasUsableCover(images?: Array<{ imageUrl?: string | null }> | null) {
  return Boolean(
    images?.some((image) => {
      const url = image.imageUrl?.trim();
      return url && !["null", "undefined", "none", "-"].includes(url.toLowerCase());
    })
  );
}

function isWeakTitle(title: string) {
  const compact = title.trim().replace(/\s+/g, "");
  if (compact.length < 2 || compact.length > 80) return true;
  if (/^\d+$/.test(compact)) return true;
  if (compact.length >= 3 && new Set(compact.split("")).size === 1) return true;
  return /^(test|demo|sample|placeholder|测试|測試|样例|占位)$/i.test(compact);
}

export function isPublicQualityWork(work: PublicQualityWorkLike) {
  const description = work.description.trim();
  return (
    work.reviewStatus === ReviewStatus.APPROVED &&
    work.contentStatus === ContentStatus.VISIBLE &&
    hasUsableCover(work.images) &&
    !isWeakTitle(work.title) &&
    description.length >= 16 &&
    description.length <= 5000
  );
}
