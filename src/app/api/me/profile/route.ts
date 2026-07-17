import { NextResponse } from "next/server";
import { Prisma, UserPersona } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { maskEmail } from "@/lib/provider-experience";
import { maskPhone, validatePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

const providerPersonas = new Set<UserPersona>([
  UserPersona.FABRIC_SUPPLIER,
  UserPersona.SAMPLE_STUDIO,
  UserPersona.FACTORY,
  UserPersona.BUYER,
  UserPersona.OTHER
]);

const profileSchema = z.object({
  nickname: z.string().trim().min(1, "昵称必填").max(24, "昵称不能超过 24 字"),
  school: z.string().trim().max(60, "学校不能超过 60 字").optional().nullable(),
  city: z.string().trim().max(40, "城市不能超过 40 字").optional().nullable(),
  phone: z.string().trim().max(32, "手机号不能超过 32 个字符").optional().nullable(),
  styleTags: z.string().trim().max(120, "风格标签不能超过 120 字").optional().nullable(),
  bio: z.string().trim().max(200, "个人简介不能超过 200 字").optional().nullable()
});

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function cleanStyleTags(value?: string | null) {
  const tags = value
    ?.split(/[,，、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags?.length ? Array.from(new Set(tags)).join(", ") : null;
}

function profilePayload(user: {
  nickname: string;
  email: string | null;
  phone: string | null;
  persona: UserPersona;
  designerProfile?: {
    school: string | null;
    city: string | null;
    designDirection: string | null;
    bio: string | null;
  } | null;
}, isProviderAccount?: boolean) {
  const isProvider = isProviderAccount ?? providerPersonas.has(user.persona);
  return {
    nickname: user.nickname,
    phone: user.phone ?? "",
    maskedPhone: maskPhone(user.phone) ?? "未填写",
    email: user.email ?? "",
    maskedEmail: maskEmail(user.email),
    persona: user.persona,
    isProvider,
    school: isProvider ? "" : user.designerProfile?.school ?? "",
    city: isProvider ? "" : user.designerProfile?.city ?? "",
    styleTags: isProvider ? "" : user.designerProfile?.designDirection ?? "",
    bio: isProvider ? "" : user.designerProfile?.bio ?? ""
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { designerProfile: true }
  });

  if (!user) {
    return NextResponse.json({ message: "账号不存在。" }, { status: 404 });
  }

  const provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { ownerId: user.id },
        ...(user.email ? [{ contactEmail: user.email }] : [])
      ]
    },
    select: { id: true }
  });

  return NextResponse.json({ profile: profilePayload(user, Boolean(provider)) });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "请检查资料内容。" }, { status: 422 });
  }

  const phoneResult = validatePhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return NextResponse.json({ message: phoneResult.message ?? "手机号格式不正确。" }, { status: 422 });
  }

  if (phoneResult.normalized) {
    const phoneOwner = await prisma.user.findFirst({
      where: {
        phone: phoneResult.normalized,
        id: { not: currentUser.id }
      },
      select: { id: true }
    });
    if (phoneOwner) {
      return NextResponse.json({ message: "该手机号已被使用" }, { status: 409 });
    }
  }

  try {
    const profile = await prisma.$transaction(async (tx) => {
      const userBeforeUpdate = await tx.user.findUnique({
        where: { id: currentUser.id },
        select: { persona: true, email: true }
      });
      const provider = await tx.provider.findFirst({
        where: {
          OR: [
            { ownerId: currentUser.id },
            ...(userBeforeUpdate?.email ? [{ contactEmail: userBeforeUpdate.email }] : [])
          ]
        },
        select: { id: true }
      });
      const isProvider = Boolean(provider) || (userBeforeUpdate ? providerPersonas.has(userBeforeUpdate.persona) : false);

      const user = await tx.user.update({
        where: { id: currentUser.id },
        data: {
          nickname: parsed.data.nickname,
          phone: phoneResult.normalized
        },
        include: { designerProfile: true }
      });

      if (isProvider) {
        return profilePayload(user, true);
      }

      const designerProfile = await tx.designerProfile.upsert({
        where: { userId: currentUser.id },
        create: {
          userId: currentUser.id,
          school: cleanText(parsed.data.school),
          city: cleanText(parsed.data.city),
          designDirection: cleanStyleTags(parsed.data.styleTags),
          bio: cleanText(parsed.data.bio)
        },
        update: {
          school: cleanText(parsed.data.school),
          city: cleanText(parsed.data.city),
          designDirection: cleanStyleTags(parsed.data.styleTags),
          bio: cleanText(parsed.data.bio)
        }
      });

      return profilePayload({ ...user, designerProfile }, false);
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "该手机号已被使用" }, { status: 409 });
    }

    console.error("Profile update failed", {
      errorType: error instanceof Error ? error.name : typeof error
    });
    return NextResponse.json({ message: "保存失败，请稍后再试。" }, { status: 500 });
  }
}
