import { CooperationType, ProviderInquiryType, RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { providerBelongsToUser, publicProviderWhere } from "@/lib/supply-network";
import { publicWorkWhere } from "@/lib/works/public";

const cooperationRequestSchema = z.object({
  workId: z.string().trim().optional().nullable(),
  providerId: z.string().trim().optional().nullable(),
  fabricId: z.string().trim().optional().nullable(),
  showcaseItemId: z.string().trim().optional().nullable(),
  type: z.nativeEnum(CooperationType).optional().default(CooperationType.OPEN_COOP),
  requestType: z.nativeEnum(ProviderInquiryType).optional().default(ProviderInquiryType.GENERAL),
  contact: z.string().trim().max(160).optional().nullable(),
  contactPreference: z.string().trim().max(160).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999999).optional().nullable(),
  budgetRange: z.string().trim().max(120).optional().nullable(),
  expectedDate: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().min(1).max(2000)
});

function dateFromInput(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "请先登录后再提交合作意向。" }, { status: 401 });
  }

  const parsed = cooperationRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "请填写合作类型、联系方式和合作说明。" }, { status: 400 });
  }

  const data = parsed.data;
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
        ownerId: true,
        contactEmail: true
      }
    });

    if (!provider) {
      return NextResponse.json({ message: "服务商不存在或暂不可发起合作。" }, { status: 404 });
    }

    if (providerBelongsToUser(provider, user)) {
      return NextResponse.json({ message: "不能给自己的服务商主页发起询盘。" }, { status: 400 });
    }

    if (data.workId) {
      const ownWork = await prisma.work.findFirst({
        where: {
          id: data.workId,
          userId: user.id
        },
        select: { id: true }
      });
      if (!ownWork) {
        return NextResponse.json({ message: "只能关联你自己的作品。" }, { status: 400 });
      }
      workId = ownWork.id;
    }

    if (data.fabricId) {
      const fabric = await prisma.fabric.findFirst({
        where: { id: data.fabricId, providerId: provider.id },
        select: { id: true }
      });
      if (!fabric) return NextResponse.json({ message: "面料不属于该服务商。" }, { status: 400 });
    }

    if (data.showcaseItemId) {
      const showcase = await prisma.providerShowcaseItem.findFirst({
        where: { id: data.showcaseItemId, providerId: provider.id, status: "PUBLISHED" },
        select: { id: true }
      });
      if (!showcase) return NextResponse.json({ message: "案例不属于该服务商或尚未公开。" }, { status: 400 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sameProviderCount, allProviderCount] = await Promise.all([
      prisma.cooperationRequest.count({
        where: {
          userId: user.id,
          providerId: provider.id,
          createdAt: { gte: since }
        }
      }),
      prisma.cooperationRequest.count({
        where: {
          userId: user.id,
          providerId: { not: null },
          createdAt: { gte: since }
        }
      })
    ]);

    if (sameProviderCount >= 5) {
      return NextResponse.json({ message: "同一服务商 24 小时内最多提交 5 次询盘，请稍后再试。" }, { status: 429 });
    }

    if (allProviderCount >= 20) {
      return NextResponse.json({ message: "你 24 小时内提交的供应商询盘较多，请稍后再试。" }, { status: 429 });
    }

    const item = await prisma.cooperationRequest.create({
      data: {
        userId: user.id,
        workId,
        providerId: provider.id,
        fabricId: data.fabricId || null,
        showcaseItemId: data.showcaseItemId || null,
        type: data.type,
        requestType: data.requestType,
        contact: data.contact || data.contactPreference || user.email,
        contactPreference: data.contactPreference || null,
        quantity: data.quantity || null,
        expectedDate: dateFromInput(data.expectedDate),
        message: data.message,
        budgetRange: data.budgetRange || null,
        status: RequestStatus.PENDING
      }
    });

    return NextResponse.json({ request: item, limits: { sameProviderRemaining: 4 - sameProviderCount, dailyRemaining: 19 - allProviderCount } }, { status: 201 });
  }

  if (!data.workId) {
    return NextResponse.json({ message: "缺少作品 ID。" }, { status: 400 });
  }

  const work = await prisma.work.findFirst({
    where: {
      id: data.workId,
      ...publicWorkWhere
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在或暂不可提交合作意向。" }, { status: 404 });
  }

  const item = await prisma.cooperationRequest.create({
    data: {
      userId: user.id,
      workId: work.id,
      type: data.type,
      requestType: data.requestType,
      contact: data.contact || data.contactPreference || user.email,
      contactPreference: data.contactPreference || null,
      quantity: data.quantity || null,
      expectedDate: dateFromInput(data.expectedDate),
      message: data.message,
      budgetRange: data.budgetRange || null,
      status: RequestStatus.PENDING
    }
  });

  return NextResponse.json({ request: item }, { status: 201 });
}
