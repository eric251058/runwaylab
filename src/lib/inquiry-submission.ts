// Persist only a digest and random submission ID, never contact details or message text.
const memory = new Map<string, { id: string; expires: number }>();
const lifetime = 24 * 60 * 60 * 1000;
export async function inquirySubmissionId(scope: string, body: string, renew = false): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${scope}\n${body}`));
  const key = `runway:inquiry:v1:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`;
  let saved = memory.get(key);
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) saved = JSON.parse(raw);
  } catch { /* Storage may be unavailable; same-page retry still works. */ }
  if (renew || !saved || typeof saved.id !== "string" || !/^[0-9a-f-]{36}$/i.test(saved.id) || !(saved.expires > Date.now())) {
    saved = { id: crypto.randomUUID(), expires: Date.now() + lifetime };
  }
  memory.set(key, saved);
  try { sessionStorage.setItem(key, JSON.stringify(saved)); } catch { /* Optional persistence. */ }
  return saved.id;
}
