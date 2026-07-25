import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export type WorkShareInfo = {
  id: string;
  title: string;
  description?: string | null;
  designerName: string;
  schoolName?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  styleTags?: string[] | null;
  category?: string | null;
};

const contactPatterns = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:\+?86[-\s]?)?1[3-9]\d{9}/g,
  /(wechat|微信|whatsapp)[:：]?\s*\S+/gi
];

export function stripContactInfo(value?: string | null) {
  let text = value?.replace(/\s+/g, " ").trim() ?? "";
  for (const pattern of contactPatterns) {
    text = text.replace(pattern, "");
  }
  return text.replace(/\s+/g, " ").trim();
}

export function truncateShareText(value: string, limit: number) {
  const safe = stripContactInfo(value);
  return safe.length > limit ? `${safe.slice(0, Math.max(0, limit - 1))}…` : safe;
}

export function workCanonicalUrl(workId: string) {
  return `${SITE_URL}/works/${encodeURIComponent(workId)}`;
}

export function safeWorkImageUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;
  if (url.startsWith("//")) return null;
  if (/^(javascript|data):/i.test(url)) return null;
  if (url.startsWith("/")) return `${SITE_URL}${url}`;
  return /^https?:\/\//i.test(url) ? url : null;
}

export function workShareTitle(work: Pick<WorkShareInfo, "title" | "designerName">) {
  return `${truncateShareText(work.title, 48)}｜${truncateShareText(work.designerName, 28)}｜${SITE_NAME}`;
}

export function workShareDescription(work: WorkShareInfo) {
  const parts = [
    truncateShareText(work.description ?? "", 96),
    work.designerName ? `设计师：${truncateShareText(work.designerName, 24)}` : null,
    work.schoolName ? `院校：${truncateShareText(work.schoolName, 36)}` : null
  ].filter(Boolean);
  return parts.join("。").slice(0, 180) || "在 RunwayLab 发现一个值得被看见的服装设计作品。";
}

export function systemShareText(work: WorkShareInfo) {
  return `我在 ${SITE_NAME} 发现了「${truncateShareText(work.title, 36)}」，来自${truncateShareText(work.designerName, 24)}的服装设计作品。`;
}

function tagText(value: string) {
  return value.replace(/^#/, "").replace(/\s+/g, "");
}

export function xiaohongshuCopy(work: WorkShareInfo) {
  const tags = [
    ...(work.styleTags ?? []),
    work.category,
    "服装设计",
    "新锐设计师",
    SITE_NAME
  ]
    .filter(Boolean)
    .map((tag) => tagText(String(tag)))
    .filter((tag, index, all) => tag && all.indexOf(tag) === index)
    .slice(0, 5)
    .map((tag) => `#${tag}`)
    .join("\n");

  return [
    `我在 ${SITE_NAME} 发现了一个很有意思的服装设计作品：`,
    "",
    `「${truncateShareText(work.title, 40)}」`,
    "",
    `设计师：${truncateShareText(work.designerName, 24)}`,
    work.schoolName ? `院校：${truncateShareText(work.schoolName, 36)}${work.city ? ` / ${truncateShareText(work.city, 16)}` : ""}` : null,
    "",
    "你最喜欢它的哪个细节？",
    "",
    tags
  ]
    .filter((line) => line !== null)
    .join("\n")
    .trim();
}
