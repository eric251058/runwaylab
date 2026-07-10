import { NextResponse } from "next/server";
import { ProviderOpportunityInterestType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { providerCanSeeStage } from "@/lib/order-maturity";
import { getProviderForUser } from "@/lib/provider-access";
import { prisma } from "@/lib/prisma";

const interestSchema = z.object({
  interestType: z.nativeEnum(ProviderOpportunityInterestType),
  note: z.string().trim().max(500).optional().nullable(),
  expectedPriceMin: z.coerce.number().nonnegative().optional().nullable(),
  expectedPriceMax: z.coerce.number().nonnegative().optional().nullable(),
  minimumQuantity: z.coerce.number().int().nonnegative().optional().nullable(),
  leadDays: z.coerce.number().int().nonnegative().optional().nullable()
});

type RouteContext = {
  params: Promise<{
    workId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const provider = await getProviderForUser(user);
  const { workId } = await context.params;

  if (!user || !provider) {
    return NextResponse.json({ message: "请先完成服务商入驻和资料审核。" }, { status: 403 });
  }

  const parsed = interestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "意向内容格式不正确。" }, { status: 400 });
  }

  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      images: true,
      teacherRecommendations: true,
      fabricRecommendations: true,
      providerWorkProposals: true,
      presaleCampaignIntents: true,
      buyerIntents: true,
      votes: { where: { status: "ACTIVE", type: "WANT_BUY" } },
      opportunityProfile: true
    }
  });

  if (!work?.opportunityProfile || !providerCanSeeStage(provider, work.opportunityProfile)) {
    return NextResponse.json({ message: "该机会暂不符合你的服务能力或尚未开放。" }, { status: 403 });
  }

  await prisma.providerOpportunityInterest.upsert({
    where: {
      providerId_workId: {
        providerId: provider.id,
        workId
      }
    },
    create: {
      providerId: provider.id,
      workId,
      interestType: parsed.data.interestType,
      note: parsed.data.note || null,
      expectedPriceMin: parsed.data.expectedPriceMin ?? null,
      expectedPriceMax: parsed.data.expectedPriceMax ?? null,
      minimumQuantity: parsed.data.minimumQuantity ?? null,
      leadDays: parsed.data.leadDays ?? null
    },
    update: {
      interestType: parsed.data.interestType,
      note: parsed.data.note || null,
      expectedPriceMin: parsed.data.expectedPriceMin ?? null,
      expectedPriceMax: parsed.data.expectedPriceMax ?? null,
      minimumQuantity: parsed.data.minimumQuantity ?? null,
      leadDays: parsed.data.leadDays ?? null
    }
  });

  return NextResponse.json({ message: "服务商意向已提交，平台会协助后续对接。" }, { status: 201 });
}
