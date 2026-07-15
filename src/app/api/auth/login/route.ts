import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { apiError, tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, clearRateLimit, consumeRateLimit, getClientIp, peekRateLimit } from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`login:ip:${ip}:10m`, { windowMs: 10 * 60 * 1000, limit: 20 });

  if (ipLimit.limited) {
    return tooManyRequests("尝试次数过多，请稍后再试。", ipLimit.retryAfter);
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return apiError("请填写邮箱和密码。", 400);
  }

  const email = parsed.data.email.toLowerCase();
  const failureKey = `login:email-fail:${email}:10m`;
  const failureLimit = peekRateLimit(failureKey, { windowMs: 10 * 60 * 1000, limit: 8 });

  if (failureLimit.limited) {
    return tooManyRequests("尝试次数过多，请稍后再试。", failureLimit.retryAfter);
  }

  const user = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    const failed = consumeRateLimit(failureKey, { windowMs: 10 * 60 * 1000, limit: 8 });
    return apiError("邮箱或密码不正确。", failed.limited ? 429 : 401, failed.limited ? { retryAfter: failed.retryAfter } : undefined);
  }

  if (user.status !== UserStatus.ACTIVE) {
    return apiError("账号当前无法使用，请联系平台。", 403);
  }

  clearRateLimit(failureKey);
  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      status: user.status
    }
  });
}
