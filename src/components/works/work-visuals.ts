const fallbackImages = [
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=80"
];

export function visualFor(index: number, preferredUrl?: string | null) {
  if (preferredUrl && !preferredUrl.startsWith("/uploads/seed/")) {
    return preferredUrl;
  }

  return fallbackImages[index % fallbackImages.length];
}

export function initials(name?: string | null) {
  if (!name) return "RL";
  return name.trim().slice(0, 2).toUpperCase();
}
