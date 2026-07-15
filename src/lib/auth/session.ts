import crypto from "node:crypto";
import { cookies } from "next/headers";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "runwaylab_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    expires: expiresAt,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function deleteUserSessions(userId: string) {
  await prisma.authSession.deleteMany({
    where: { userId }
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: true
    }
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.authSession.deleteMany({
        where: { id: session.id }
      });
    }
    return null;
  }

  if (!session.user || session.user.status !== UserStatus.ACTIVE) {
    await prisma.authSession.deleteMany({
      where: { id: session.id }
    });
    return null;
  }

  return session.user;
}
