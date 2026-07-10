import crypto from "node:crypto";
import { cookies } from "next/headers";

const CONTRIBUTOR_COOKIE = "runwaylab_contributor_id";
const CONTRIBUTOR_MAX_AGE = 365 * 24 * 60 * 60;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function getContributionActorKey(user?: { id: string } | null) {
  if (user?.id) {
    return sha256(`user:${user.id}`);
  }

  const cookieStore = await cookies();
  let contributorId = cookieStore.get(CONTRIBUTOR_COOKIE)?.value;

  if (!contributorId) {
    contributorId = crypto.randomUUID();
    cookieStore.set(CONTRIBUTOR_COOKIE, contributorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: CONTRIBUTOR_MAX_AGE
    });
  }

  return sha256(`anonymous:${contributorId}`);
}

export function actorSourceLabel(actorKey: string) {
  return `#${actorKey.slice(-6).toUpperCase()}`;
}
