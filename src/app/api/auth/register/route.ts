import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { validatePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { apiError, tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  nickname: z.string().trim().min(2).max(24),
  phone: z.string().trim().max(32).optional().nullable()
});

export async function POST(request: Request) {
  const ipLimit = checkRateLimit(`register:ip:${getClientIp(request)}:1h`, { windowMs: 60 * 60 * 1000, limit: 5 });

  if (ipLimit.limited) {
    return tooManyRequests("尝试次数过多，请稍后再试。", ipLimit.retryAfter);
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return apiError("请填写有效邮箱、昵称和至少 8 位密码。", 400);
  }

  const email = parsed.data.email.toLowerCase();
  const phoneResult = validatePhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return apiError(phoneResult.message ?? "手机号格式不正确。", 400);
  }

  const existed = await prisma.user.findUnique({ where: { email } });

  if (existed) {
    return apiError("该邮箱已注册，请直接登录。", 409);
  }

  if (phoneResult.normalized) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone: phoneResult.normalized } });
    if (phoneOwner) {
      return apiError("该手机号已被使用", 409);
    }
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
          status: user.status
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      return apiError(target.includes("phone") ? "该手机号已被使用" : "该邮箱已注册，请直接登录。", 409);
    }
    throw error;
  }
}
