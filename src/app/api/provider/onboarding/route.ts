import { NextResponse } from "next/server";
import { ProviderStatus, ProviderType, Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  fieldErrorsFromZod,
  normalizeProviderServices,
  personaForProviderType,
  providerTypeFromServices,
  quickProviderSchema
} from "@/lib/provider-experience";

function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ message, fieldErrors }, { status });
}

function defaultProviderName(nickname: string) {
  return `${nickname || "RunwayLab"}的服务商主页`;
}

function contactEmailForUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.email?.trim() || null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("登录状态失效，请重新登录。", 401);

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return jsonError("请求格式错误，请重新提交。", 400);

  const skipProfile = raw.skipProfile === true;
  const providedServices = normalizeProviderServices(raw.services);
  const normalized = {
    name: skipProfile ? String(raw.name || defaultProviderName(user.nickname)).trim() : raw.name,
    services: skipProfile ? (providedServices.length ? providedServices : ["其他服务"]) : raw.services,
    intro: skipProfile ? "" : raw.intro,
    skipProfile
  };

  const parsed = quickProviderSchema.safeParse(normalized);
  if (!parsed.success) {
    return jsonError("请检查服务商主页信息。", 422, fieldErrorsFromZod(parsed.error));
  }

  const services = parsed.data.services;
  const providerType = providerTypeFromServices(services);
  const contactEmail = contactEmailForUser(user);

  try {
    const existingProvider = await prisma.provider.findFirst({
      where: {
        OR: [
          { ownerId: user.id },
          ...(contactEmail ? [{ contactEmail: { equals: contactEmail, mode: Prisma.QueryMode.insensitive } }] : [])
        ]
      },
      select: { id: true, type: true, ownerId: true }
    });

    const providerData = {
      name: parsed.data.name,
      ownerId: user.id,
      type: providerType,
      tagline: parsed.data.intro || null,
      description: parsed.data.intro || null,
      contactEmail,
      contactPhone: user.phone || null,
      specialties: services,
      categories: services,
      tags: services,
      status: ProviderStatus.ACTIVE,
      isVerified: false,
      opportunityVisible: true,
      publicContactEnabled: false,
      acceptsSampling: providerType === ProviderType.FABRIC_SUPPLIER || providerType === ProviderType.SAMPLE_STUDIO,
      acceptsSmallBatch: providerType === ProviderType.FACTORY || providerType === ProviderType.SAMPLE_STUDIO,
      acceptsLargeOrder: providerType === ProviderType.FACTORY
    };

    const provider = existingProvider
      ? await prisma.provider.update({
          where: { id: existingProvider.id },
          data: providerData,
          select: { id: true, name: true, type: true, status: true }
        })
      : await prisma.provider.create({
          data: providerData,
          select: { id: true, name: true, type: true, status: true }
        });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        persona: personaForProviderType(provider.type),
        personaCompleted: true
      }
    });

    return NextResponse.json({ provider, next: "/provider-center" }, { status: existingProvider ? 200 : 201 });
  } catch (error) {
    console.error("Provider onboarding failed", {
      errorType: error instanceof Error ? error.name : typeof error
    });
    return jsonError("系统暂时无法创建服务商主页，请稍后再试。", 500);
  }
}
