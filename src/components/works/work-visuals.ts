const placeholderImage = "/images/work-placeholder.svg";

export type WorkImageLike = {
  imageUrl?: string | null;
  url?: string | null;
  src?: string | null;
};

export function getWorkImageUrl(input?: string | WorkImageLike | null): string {
  if (!input) {
    return "";
  }

  if (typeof input === "string") {
    return input;
  }

  return input.imageUrl ?? input.url ?? input.src ?? "";
}

export function visualFor(index: number, preferredUrl?: string | WorkImageLike | null) {
  const normalizedUrl = normalizeImageUrl(getWorkImageUrl(preferredUrl));

  if (normalizedUrl && !normalizedUrl.startsWith("/uploads/seed/")) {
    return normalizedUrl;
  }

  return placeholderImage;
}

export function normalizeImageUrl(input: string | null | undefined): string {
  const value = input?.trim();

  if (!value) {
    return "";
  }

  const normalized = value.replaceAll("\\", "/");

  if (normalized.startsWith("blob:")) {
    return normalized;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/public/uploads/")) {
    return normalized.replace(/^\/public\//, "/");
  }

  if (normalized.startsWith("/uploads/")) {
    return normalized;
  }

  if (normalized.startsWith("public/uploads/")) {
    return `/${normalized.replace(/^public\//, "")}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return `/${normalized}`;
}

export function initials(name?: string | null) {
  if (!name) return "RL";
  return name.trim().slice(0, 2).toUpperCase();
}
