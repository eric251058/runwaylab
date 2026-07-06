import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  nickname: z.string().trim().min(1, "昵称必填").max(24, "昵称不能超过 24 字"),
  school: z.string().trim().max(60, "学校不能超过 60 字").optional().nullable(),
  city: z.string().trim().max(40, "城市不能超过 40 字").optional().nullable(),
  styleTags: z.string().trim().max(120, "风格标签不能超过 120 字").optional().nullable(),
  bio: z.string().trim().max(200, "个人简介不能超过 200 字").optional().nullable()
});

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function cleanStyleTags(value?: string | null) {
  const tags = value
    ?.split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags?.length ? Array.from(new Set(tags)).join(", ") : null;
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id
    },
    include: {
      designerProfile: true
    }
  });

  if (!user) {
    return NextResponse.json({ message: "账号不存在。" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      nickname: user.nickname,
      school: user.designerProfile?.school ?? "",
      city: user.designerProfile?.city ?? "",
      styleTags: user.designerProfile?.designDirection ?? "",
      bio: user.designerProfile?.bio ?? ""
    }
  });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "请检查资料内容。" }, { status: 400 });
  }

  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id: currentUser.id
      },
      data: {
        nickname: parsed.data.nickname
      }
    });

    const designerProfile = await tx.designerProfile.upsert({
      where: {
        userId: currentUser.id
      },
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

    return {
      nickname: user.nickname,
      school: designerProfile.school ?? "",
      city: designerProfile.city ?? "",
      styleTags: designerProfile.designDirection ?? "",
      bio: designerProfile.bio ?? ""
    };
  });

  return NextResponse.json({ profile });
}
