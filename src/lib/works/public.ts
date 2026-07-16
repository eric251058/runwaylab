import type { Prisma } from "@prisma/client";
import { publicQualityWorkWhere } from "@/lib/works/rules";
import { isPublicQualityWork } from "@/lib/works/rules";

export const publicWorkWhere = publicQualityWorkWhere;

export const publicQualityWorkCheckSelect = {
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
} satisfies Prisma.WorkSelect;

export type PublicQualityWorkCheck = Prisma.WorkGetPayload<{ select: typeof publicQualityWorkCheckSelect }>;

export function isPublicWorkAccessible<T extends PublicQualityWorkCheck>(work: T | null | undefined): work is T {
  return Boolean(work && isPublicQualityWork(work));
}
