export type PhoneValidationResult = {
  ok: boolean;
  normalized: string | null;
  message?: string;
};

const CHINA_MOBILE_RE = /^1[3-9]\d{9}$/;
const INTERNATIONAL_PHONE_RE = /^\+[1-9]\d{7,14}$/;

function compactPhone(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\s\-()（）]/g, "");
}

export function normalizePhone(value: unknown): string | null {
  const compacted = compactPhone(value);
  if (!compacted) return null;

  if (CHINA_MOBILE_RE.test(compacted)) {
    return `+86${compacted}`;
  }

  const withoutPlus = compacted.startsWith("+") ? compacted.slice(1) : compacted;
  if (withoutPlus.startsWith("86") && CHINA_MOBILE_RE.test(withoutPlus.slice(2))) {
    return `+86${withoutPlus.slice(2)}`;
  }

  if (compacted.startsWith("+") && INTERNATIONAL_PHONE_RE.test(compacted)) {
    return compacted;
  }

  return null;
}

export function validatePhone(value: unknown): PhoneValidationResult {
  const compacted = compactPhone(value);
  if (!compacted) {
    return { ok: true, normalized: null };
  }

  const normalized = normalizePhone(value);
  if (!normalized) {
    return {
      ok: false,
      normalized: null,
      message: "手机号格式不正确，请填写中国大陆手机号或以 + 开头的国际手机号。"
    };
  }

  if (normalized.startsWith("+86") && !CHINA_MOBILE_RE.test(normalized.slice(3))) {
    return {
      ok: false,
      normalized: null,
      message: "中国大陆手机号格式不正确。"
    };
  }

  return { ok: true, normalized };
}

export function maskPhone(value?: string | null) {
  const normalized = normalizePhone(value ?? "");
  if (!normalized) return null;

  if (normalized.startsWith("+86")) {
    const mobile = normalized.slice(3);
    return `+86 ${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
  }

  const digits = normalized.slice(1);
  if (digits.length <= 8) {
    return `${normalized.slice(0, 3)}****${normalized.slice(-2)}`;
  }

  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)}****${digits.slice(-3)}`;
}
