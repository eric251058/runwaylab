import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { apiError, tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nickname: z.string().min(2).max(24)
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
  const existed = await prisma.user.findUnique({ where: { email } });

  if (existed) {
    return apiError("该邮箱已注册，请直接登录。", 409);
  }

  const user = await prisma.user.create({
    data: {
      email,
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
}
