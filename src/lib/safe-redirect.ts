import { SITE_URL } from "@/lib/site-config";

export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;
  if (value !== value.trim()) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  if (/(:\/\/|javascript:|data:)/i.test(value)) return fallback;

  try {
    const parsed = new URL(value, SITE_URL);
    return parsed.origin === SITE_URL && `${parsed.pathname}${parsed.search}${parsed.hash}` === value ? value : fallback;
  } catch {
    return fallback;
  }
}
