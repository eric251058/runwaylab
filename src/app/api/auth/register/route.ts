import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { apiError, tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { normalizeEmail, validateOptionalPhone } from "@/lib/user-contact";

const registerSchema = z.object({
  email: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  password: z.string().min(8),
  nickname: z.string().trim().min(2).max(24)
});

export async function POST(request: Request) {
  const ipLimit = checkRateLimit(`register:ip:${getClientIp(request)}:1h`, { windowMs: 60 * 60 * 1000, limit: 5 });
  if (ipLimit.limited) return tooManyRequests("尝试次数过多，请稍后再试。", ipLimit.retryAfter);

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("请填写昵称和至少 8 位密码。", 400);

  const identityEnabled = await isFeatureEnabled("feature.identity_v234");
  const email = normalizeEmail(parsed.data.email);
  const phoneResult = validateOptionalPhone(parsed.data.phone);

  if (!phoneResult.ok) return apiError(phoneResult.message ?? "手机号格式不正确。", 400);
  if (!identityEnabled && !email) return apiError("请填写有效邮箱。", 400);
  if (identityEnabled && !email && !phoneResult.normalized) return apiError("请填写邮箱或手机号。", 400);
  if (parsed.data.email && !email) return apiError("邮箱格式不正确。", 400);

  if (email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner) return apiError("该邮箱已注册，请直接登录。", 409);
  }

  if (phoneResult.normalized) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone: phoneResult.normalized } });
    if (phoneOwner) return apiError("该手机号已被使用。", 409);
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        phone: phoneResult.normalized,
        nickname: parsed.data.nickname,
        passwordHash: await hashPassword(parsed.data.password),
        role: UserRole.NEW_DESIGNER,
        designerProfile: {
          create: {}
        }
      }
    });

    await createSession(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
          persona: user.persona,
          personaCompleted: user.personaCompleted
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      return apiError(target.includes("phone") ? "该手机号已被使用。" : "该邮箱已注册，请直接登录。", 409);
    }
    throw error;
  }
}
