import { NextResponse } from "next/server";
import { BatchProviderRole, BatchProviderStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getProviderForUser } from "@/lib/provider-access";
import { providerCanSeeBatch } from "@/lib/incubation-batches";
import { prisma } from "@/lib/prisma";

const applySchema = z.object({
  role: z.nativeEnum(BatchProviderRole),
  note: z.string().trim().max(500).optional().nullable(),
  minimumQuantity: z.coerce.number().int().nonnegative().optional().nullable(),
  maximumQuantity: z.coerce.number().int().nonnegative().optional().nullable(),
  expectedPriceMin: z.coerce.number().nonnegative().optional().nullable(),
  expectedPriceMax: z.coerce.number().nonnegative().optional().nullable(),
  sampleLeadDays: z.coerce.number().int().nonnegative().optional().nullable(),
  productionLeadDays: z.coerce.number().int().nonnegative().optional().nullable()
});

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const provider = await getProviderForUser(user);
  const { batchId } = await context.params;

  if (!user || !provider) {
    return NextResponse.json({ message: "请先完成服务商入驻和资料审核。" }, { status: 403 });
  }

  const parsed = applySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "申请内容格式不正确。" }, { status: 400 });
  }

  const batch = await prisma.incubationBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      type: true,
      status: true,
      targetSampleCount: true,
      targetProductionQuantity: true,
      confirmedProductionQuantity: true,
      adminApproved: true
    }
  });

  if (!batch || !providerCanSeeBatch(provider, batch)) {
    return NextResponse.json({ message: "该批次暂不符合你的服务能力或尚未开放。" }, { status: 403 });
  }

  await prisma.incubationBatchProvider.upsert({
    where: {
      batchId_providerId_role: {
        batchId,
        providerId: provider.id,
        role: parsed.data.role
      }
    },
    create: {
      batchId,
      providerId: provider.id,
      role: parsed.data.role,
      status: BatchProviderStatus.APPLIED,
      note: parsed.data.note || null,
      minimumQuantity: parsed.data.minimumQuantity ?? null,
      maximumQuantity: parsed.data.maximumQuantity ?? null,
      expectedPriceMin: parsed.data.expectedPriceMin ?? null,
      expectedPriceMax: parsed.data.expectedPriceMax ?? null,
      sampleLeadDays: parsed.data.sampleLeadDays ?? null,
      productionLeadDays: parsed.data.productionLeadDays ?? null
    },
    update: {
      status: BatchProviderStatus.APPLIED,
      note: parsed.data.note || null,
      minimumQuantity: parsed.data.minimumQuantity ?? null,
      maximumQuantity: parsed.data.maximumQuantity ?? null,
      expectedPriceMin: parsed.data.expectedPriceMin ?? null,
      expectedPriceMax: parsed.data.expectedPriceMax ?? null,
      sampleLeadDays: parsed.data.sampleLeadDays ?? null,
      productionLeadDays: parsed.data.productionLeadDays ?? null
    }
  });

  return NextResponse.json({ message: "批次参与申请已提交，平台会协助后续对接。" }, { status: 201 });
}
