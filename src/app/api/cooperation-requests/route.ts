import { CooperationType, ProviderInquiryType, RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotificationSafe } from "@/lib/fabric-recommendations";
import { inquiryTypeFromInput } from "@/lib/provider-experience";
import { prisma } from "@/lib/prisma";
import { tooManyRequests } from "@/lib/security/api-response";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { providerBelongsToUser, publicProviderWhere } from "@/lib/supply-network";
import { isPublicWorkAccessible, publicQualityWorkCheckSelect, publicWorkWhere } from "@/lib/works/public";

const cooperationRequestSchema = z.object({
  workId: z.string().trim().optional().nullable(),
  providerId: z.string().trim().optional().nullable(),
  fabricId: z.string().trim().optional().nullable(),
  showcaseItemId: z.string().trim().optional().nullable(),
  type: z.nativeEnum(CooperationType).optional().default(CooperationType.OPEN_COOP),
  requestType: z.string().trim().optional().nullable(),
  contact: z.string().trim().max(160).optional().nullable(),
  contactPreference: z.enum(["SITE_ONLY", "ALLOW_PHONE", "ALLOW_EMAIL"]).optional().default("SITE_ONLY"),
  quantity: z.coerce.number().int().min(1).max(999999).optional().nullable(),
  budgetRange: z.string().trim().max(120).optional().nullable(),
  expectedDate: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().min(1, "请填写需求说明。").max(2000)
});

function dateFromInput(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function contactFromAuthorization({
  requested,
  explicitContact,
  userEmail,
  userPhone
}: {
  requested: "SITE_ONLY" | "ALLOW_PHONE" | "ALLOW_EMAIL";
  explicitContact?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
}) {
  if (requested === "ALLOW_PHONE" && userPhone) return userPhone;
  if (requested === "ALLOW_EMAIL" && userEmail) return userEmail;
  return explicitContact || "站内沟通";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("请先登录后再发送询盘。", 401);
  }

  const limit = checkRateLimit(`cooperation-request:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 10 });
  if (limit.limited) return tooManyRequests("提交较频繁，请稍后再试。", limit.retryAfter);

  const parsed = cooperationRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "请检查询盘内容。", 422);
  }

  const data = parsed.data;
  const requestType = inquiryTypeFromInput(data.requestType);
  const isProviderInquiry = Boolean(data.providerId);
  let workId: string | null = null;

  if (isProviderInquiry) {
    const provider = await prisma.provider.findFirst({
      where: {
        id: data.providerId!,
        ...publicProviderWhere()
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        contactEmail: true,
        publicContactEnabled: true
      }
    });

    if (!provider) return jsonError("服务商不存在或暂不可联系。", 404);
    if (providerBelongsToUser(provider, user)) return jsonError("不能给自己的服务商主页发送询盘。", 403);
    if (!provider.publicContactEnabled) return jsonError("该服务商暂未开启站内联系。", 403);

    if (data.workId) {
      const ownWork = await prisma.work.findFirst({
        where: { id: data.workId, userId: user.id },
        select: { id: true, title: true }
      });
      if (!ownWork) return jsonError("只能关联你自己的作品。", 403);
      workId = ownWork.id;
    }

    if (data.fabricId) {
      const fabric = await prisma.fabric.findFirst({
        where: { id: data.fabricId, providerId: provider.id },
        select: { id: true }
      });
      if (!fabric) return jsonError("面料不属于该服务商。", 403);
    }

    if (data.showcaseItemId) {
      const showcase = await prisma.providerShowcaseItem.findFirst({
        where: { id: data.showcaseItemId, providerId: provider.id, status: "PUBLISHED" },
        select: { id: true }
      });
      if (!showcase) return jsonError("案例不属于该服务商或尚未公开。", 403);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sameProviderCount, allProviderCount] = await Promise.all([
      prisma.cooperationRequest.count({ where: { userId: user.id, providerId: provider.id, createdAt: { gte: since } } }),
      prisma.cooperationRequest.count({ where: { userId: user.id, providerId: { not: null }, createdAt: { gte: since } } })
    ]);

    if (sameProviderCount >= 5) return jsonError("同一服务商 24 小时内最多发送 5 次询盘，请稍后再试。", 429);
    if (allProviderCount >= 20) return jsonError("你 24 小时内提交的服务商询盘较多，请稍后再试。", 429);

    const item = await prisma.cooperationRequest.create({
      data: {
        userId: user.id,
        workId,
        providerId: provider.id,
        fabricId: data.fabricId || null,
        showcaseItemId: data.showcaseItemId || null,
        type: data.type,
        requestType,
        contact: contactFromAuthorization({
          requested: data.contactPreference,
          explicitContact: data.contact,
          userEmail: user.email,
          userPhone: user.phone
        }),
        contactPreference: data.contactPreference,
        quantity: data.quantity || null,
        expectedDate: dateFromInput(data.expectedDate),
        message: data.message,
        budgetRange: data.budgetRange || null,
        status: RequestStatus.PENDING
      },
      select: { id: true, status: true, createdAt: true }
    });

    await createNotificationSafe({
      userId: provider.ownerId,
      title: "收到新的服务询盘",
      content: `${user.nickname} 向 ${provider.name} 发送了新的询盘。`,
      linkUrl: "/provider-center/inquiries"
    });

    return NextResponse.json({ request: item, message: "已发送。服务商回复后，我们会通知你。" }, { status: 201 });
  }

  if (!data.workId) return jsonError("缺少作品 ID。", 400);

  const work = await prisma.work.findFirst({
    where: { id: data.workId, ...publicWorkWhere },
    select: publicQualityWorkCheckSelect
  });

  if (!isPublicWorkAccessible(work)) return jsonError("作品不存在或暂不可提交合作意向。", 404);

  const item = await prisma.cooperationRequest.create({
    data: {
      userId: user.id,
      workId: work.id,
      type: data.type,
      requestType: requestType as ProviderInquiryType,
      contact: contactFromAuthorization({
        requested: data.contactPreference,
        explicitContact: data.contact,
        userEmail: user.email,
        userPhone: user.phone
      }),
      contactPreference: data.contactPreference,
      quantity: data.quantity || null,
      expectedDate: dateFromInput(data.expectedDate),
      message: data.message,
      budgetRange: data.budgetRange || null,
      status: RequestStatus.PENDING
    },
    select: { id: true, status: true, createdAt: true }
  });

  return NextResponse.json({ request: item, message: "已发送。服务商回复后，我们会通知你。" }, { status: 201 });
}
