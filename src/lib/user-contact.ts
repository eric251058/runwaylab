import { createHash } from "node:crypto";
import { maskPhone, normalizePhone, validatePhone } from "@/lib/phone";

export type NormalizedIdentifier =
  | { kind: "email"; value: string; rateLimitKey: string }
  | { kind: "phone"; value: string; rateLimitKey: string };

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function normalizeLoginIdentifier(value: unknown): NormalizedIdentifier | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.includes("@")) {
    const email = normalizeEmail(raw);
    return email ? { kind: "email", value: email, rateLimitKey: `email:${digest(email)}` } : null;
  }

  const phone = normalizePhone(raw);
  return phone ? { kind: "phone", value: phone, rateLimitKey: `phone:${digest(phone)}` } : null;
}

export function validateOptionalPhone(value: unknown) {
  return validatePhone(value);
}

export function getUserPrimaryContact(user: { email?: string | null; phone?: string | null }) {
  return user.email ?? maskPhone(user.phone) ?? "未填写联系方式";
}

export function maskUserContact(user: { email?: string | null; phone?: string | null }) {
  return [user.email, maskPhone(user.phone)].filter(Boolean).join(" / ") || "未填写联系方式";
}
