type AccountDisplayInput = {
  providerName?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  preferProvider?: boolean;
};

function clean(value?: string | null) {
  const text = value?.trim();
  return text || null;
}

export function maskEmail(value?: string | null) {
  const email = clean(value);
  if (!email || !email.includes("@")) return null;
  const [name, domain] = email.split("@");
  if (!name || !domain) return "已填写邮箱";
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}***@${domain}`;
}

export function maskPhone(value?: string | null) {
  const phone = clean(value);
  if (!phone) return null;
  if (!/^\+?[\d\s-]{7,}$/.test(phone)) return null;
  const compact = phone.replace(/[\s-]/g, "");
  const match = compact.match(/^(\+?86)?(1\d{10})$/);
  if (match) return `+86 ${match[2].slice(0, 3)}****${match[2].slice(-4)}`;
  const digits = compact.replace(/\D/g, "");
  if (digits.length >= 7) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return null;
}

export function safeAccountLabel(value?: string | null) {
  const text = clean(value);
  if (!text) return null;
  const email = maskEmail(text);
  if (email) return email;
  const phone = maskPhone(text);
  if (phone) return phone;
  return text.slice(0, 32);
}

export function accountDisplayName({
  providerName,
  nickname,
  email,
  phone,
  preferProvider = false
}: AccountDisplayInput) {
  if (preferProvider) {
    const provider = safeAccountLabel(providerName);
    if (provider) return provider;
  }

  const name = safeAccountLabel(nickname);
  if (name) return name;

  const emailLabel = maskEmail(email);
  if (emailLabel) return emailLabel;

  const phoneLabel = maskPhone(phone);
  if (phoneLabel) return phoneLabel;

  return "账号";
}
