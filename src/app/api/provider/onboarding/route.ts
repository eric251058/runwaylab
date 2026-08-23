import { NextResponse } from "next/server";
import { ProviderApplicationStatus, Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  fieldErrorsFromZod,
  normalizeProviderServices,
  providerTypeFromServices,
  quickProviderSchema
} from "@/lib/provider-experience";
import { providerDataFromApplication } from "@/lib/provider-self-service";

function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ message, fieldErrors }, { status });
}

function contactEmailForUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.email?.trim() || null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("登录状态失效，请重新登录。", 401);

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return jsonError("请求格式错误，请重新提交。", 400);

  const normalized = {
    name: raw.name,
    contactName: raw.contactName,
    phone: raw.phone,
    city: raw.city,
    services: normalizeProviderServices(raw.services),
    intro: raw.intro,
    acceptRules: raw.acceptRules
  };

  const parsed = quickProviderSchema.safeParse(normalized);
  if (!parsed.success) {
    return jsonError("请检查入驻申请信息。", 422, fieldErrorsFromZod(parsed.error));
  }

  const services = parsed.data.services;
  const providerType = providerTypeFromServices(services);
  const contactEmail = contactEmailForUser(user);

  try {
    const [existingProvider, pendingApplication] = await Promise.all([
      prisma.provider.findFirst({
        where: {
          OR: [
            { ownerId: user.id },
            ...(contactEmail ? [{ contactEmail: { equals: contactEmail, mode: Prisma.QueryMode.insensitive } }] : [])
          ]
        },
        select: { id: true }
      }),
      prisma.providerApplication.findFirst({
        where: { userId: user.id, status: ProviderApplicationStatus.PENDING },
        select: { id: true }
      })
    ]);

    if (existingProvider) return jsonError("当前账号已有服务商资料，请进入服务商中心维护。", 409);
    if (pendingApplication) return NextResponse.json({ application: pendingApplication, next: "/provider-center" }, { status: 200 });

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.providerApplication.create({
        data: {
          userId: user.id,
          providerType,
          companyName: parsed.data.name,
          contactName: parsed.data.contactName,
          phone: parsed.data.phone,
          email: contactEmail,
          city: parsed.data.city,
          specialties: services,
          categories: services,
          description: parsed.data.intro || null,
          providerDetails: {
            submissionChannel: "QUICK_ONBOARDING",
            workflow: "SELF_SERVICE_DRAFT",
            services
          },
          status: ProviderApplicationStatus.PENDING
        }
      });

      await tx.provider.create({ data: providerDataFromApplication(created) });
      return {
        id: created.id,
        companyName: created.companyName,
        providerType: created.providerType,
        status: created.status
      };
    });

    return NextResponse.json({ application, next: "/provider-center" }, { status: 201 });
  } catch (error) {
    console.error("Provider onboarding failed", {
      errorType: error instanceof Error ? error.name : typeof error
    });
    return jsonError("系统暂时无法提交入驻申请，请稍后再试。", 500);
  }
}
