export const activityWorkInclude = {
  images: {
    orderBy: {
      sortOrder: "asc" as const
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
      createdAt: "desc" as const
    },
    take: 1
  },
  incubationApplications: {
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
};

export const PLACEHOLDER_IMAGES = {
  challengeCover: "/placeholders/challenge-cover.svg",
  exhibitionCover: "/placeholders/exhibition-cover.svg",
  schoolCover: "/placeholders/school-cover.svg",
  teacherAvatar: "/placeholders/teacher-avatar.svg"
} as const;

export function displayDateRange(start?: Date | null, end?: Date | null) {
  if (!start && !end) return "时间待定";
  const format = (value: Date) =>
    value.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  if (start && end) return `${format(start)} - ${format(end)}`;
  return format((start ?? end) as Date);
}

function validImageUrl(value?: string | null) {
  const url = value?.trim();
  if (!url || ["null", "undefined", "none", "-"].includes(url.toLowerCase())) {
    return null;
  }
  return /^(https?:\/\/|\/|data:image\/)/i.test(url) ? url : null;
}

export function imageWithFallback(value: string | null | undefined, fallback: string) {
  return validImageUrl(value) ?? fallback;
}

export function challengeCoverUrl(value?: string | null) {
  return imageWithFallback(value, PLACEHOLDER_IMAGES.challengeCover);
}

export function exhibitionCoverUrl(value?: string | null) {
  return imageWithFallback(value, PLACEHOLDER_IMAGES.exhibitionCover);
}

export function schoolCoverUrl(value?: string | null) {
  return imageWithFallback(value, PLACEHOLDER_IMAGES.schoolCover);
}

export function teacherAvatarUrl(value?: string | null) {
  return imageWithFallback(value, PLACEHOLDER_IMAGES.teacherAvatar);
}

export function splitIds(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function requiredText(value: FormDataEntryValue | null, label: string) {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`${label}不能为空`);
  }
  return text;
}

export function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalText(value);
  return text ? new Date(text) : null;
}
