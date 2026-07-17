import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { apiError, tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, clearRateLimit, consumeRateLimit, getClientIp, peekRateLimit } from "@/lib/security/rate-limit";
import { normalizeEmail, normalizeLoginIdentifier } from "@/lib/user-contact";

const loginSchema = z.object({
  identifier: z.string().trim().max(160).optional(),
  email: z.string().trim().max(160).optional(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`login:ip:${ip}:10m`, { windowMs: 10 * 60 * 1000, limit: 20 });
  if (ipLimit.limited) return tooManyRequests("尝试次数过多，请稍后再试。", ipLimit.retryAfter);

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("请填写账号和密码。", 400);

  const identityEnabled = await isFeatureEnabled("feature.identity_v234");
  const rawIdentifier = parsed.data.identifier ?? parsed.data.email ?? "";
  const identifier = identityEnabled
    ? normalizeLoginIdentifier(rawIdentifier)
    : (() => {
        const email = normalizeEmail(rawIdentifier);
        const emailIdentifier = email ? normalizeLoginIdentifier(email) : null;
        return emailIdentifier?.kind === "email" ? emailIdentifier : null;
      })();

  if (!identifier) return apiError(identityEnabled ? "账号或密码错误。" : "请填写有效邮箱。", 401);

  const failureKey = `login:identifier-fail:${identifier.rateLimitKey}:10m`;
  const failureLimit = peekRateLimit(failureKey, { windowMs: 10 * 60 * 1000, limit: 8 });
  if (failureLimit.limited) return tooManyRequests("尝试次数过多，请稍后再试。", failureLimit.retryAfter);

  const user = await prisma.user.findUnique({
    where: identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    const failed = consumeRateLimit(failureKey, { windowMs: 10 * 60 * 1000, limit: 8 });
    return apiError("账号或密码错误。", failed.limited ? 429 : 401, failed.limited ? { retryAfter: failed.retryAfter } : undefined);
  }

  if (user.status !== UserStatus.ACTIVE) return apiError("账号当前无法使用，请联系平台。", 403);

  clearRateLimit(failureKey);
  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
      persona: user.persona,
      personaCompleted: user.personaCompleted
    }
  });
}
