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
  _count: {
    select: {
      presaleIntents: true,
      fabricProposals: true,
      sampleProposals: true,
      factoryProposals: true,
      buyerIntents: true
    }
  }
};

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

export function fallbackCover(seed: string) {
  const covers = [
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1200&q=80"
  ];
  const index = Math.abs(seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % covers.length;
  return covers[index];
}

export function coverUrl(seed: string, value?: string | null) {
  return value?.trim() || fallbackCover(seed);
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
