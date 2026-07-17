import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const contactSchema = z.object({
  contactPreference: z.enum(["SITE_ONLY", "ALLOW_PHONE", "ALLOW_EMAIL"])
});

function contactForPreference(preference: "SITE_ONLY" | "ALLOW_PHONE" | "ALLOW_EMAIL", user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (preference === "ALLOW_PHONE" && user.phone) return user.phone;
  if (preference === "ALLOW_EMAIL" && user.email) return user.email;
  return "站内沟通";
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "联系方式授权不正确。" }, { status: 422 });

  const inquiry = await prisma.cooperationRequest.findUnique({
    where: { id },
    include: { provider: { select: { ownerId: true, name: true } } }
  });

  if (!inquiry || inquiry.userId !== user.id) {
    return NextResponse.json({ message: "询盘不存在或没有权限修改。" }, { status: 404 });
  }

  const updated = await prisma.cooperationRequest.update({
    where: { id },
    data: {
      contactPreference: parsed.data.contactPreference,
      contact: contactForPreference(parsed.data.contactPreference, user)
    },
    select: { id: true, contactPreference: true }
  });

  await createNotificationSafe({
    userId: inquiry.provider?.ownerId,
    title: "询盘联系方式授权已更新",
    content: `${user.nickname} 更新了询盘的联系方式授权。`,
    linkUrl: "/provider-center/inquiries"
  });

  revalidatePath("/me/inquiries");
  revalidatePath("/provider-center/inquiries");

  return NextResponse.json({ inquiry: updated, message: "联系方式授权已更新。" });
}
