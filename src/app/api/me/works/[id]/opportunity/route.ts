import { NextResponse } from "next/server";
import { FabricStatus, OpportunityStage, SampleStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const allowedFabricStatus = [FabricStatus.UNKNOWN, FabricStatus.RECOMMENDED, FabricStatus.SELECTED, FabricStatus.CONFIRMED] as const;
const allowedDesignerStages = [OpportunityStage.DISPLAY_ONLY, OpportunityStage.SAMPLE_READY, OpportunityStage.SMALL_BATCH_READY] as const;

const opportunitySchema = z.object({
  stage: z.enum(allowedDesignerStages).optional(),
  targetQuantity: z.coerce.number().int().nonnegative().optional().nullable(),
  targetRetailPrice: z.coerce.number().nonnegative().optional().nullable(),
  sampleBudget: z.coerce.number().nonnegative().optional().nullable(),
  sampleStatus: z.nativeEnum(SampleStatus).optional(),
  fabricStatus: z.enum(allowedFabricStatus).optional(),
  targetLaunchDate: z.string().optional().nullable(),
  expectedReorder: z.boolean().optional(),
  designerNote: z.string().trim().max(500).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录后再维护机会资料。" }, { status: 401 });
  }

  const parsed = opportunitySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "机会资料格式不正确。" }, { status: 400 });
  }

  const work = await prisma.work.findUnique({
    where: { id },
    select: { id: true, userId: true }
  });

  if (!work || work.userId !== user.id) {
    return NextResponse.json({ message: "只能维护自己作品的机会资料。" }, { status: 403 });
  }

  const data = {
    stage: parsed.data.stage ?? OpportunityStage.DISPLAY_ONLY,
    targetQuantity: parsed.data.targetQuantity ?? null,
    targetRetailPrice: parsed.data.targetRetailPrice ?? null,
    sampleBudget: parsed.data.sampleBudget ?? null,
    sampleStatus: parsed.data.sampleStatus ?? SampleStatus.NOT_STARTED,
    fabricStatus: parsed.data.fabricStatus ?? FabricStatus.UNKNOWN,
    targetLaunchDate: optionalDate(parsed.data.targetLaunchDate),
    expectedReorder: parsed.data.expectedReorder ?? false,
    designerNote: parsed.data.designerNote || null,
    adminApproved: false
  };

  const profile = await prisma.workOpportunityProfile.upsert({
    where: { workId: id },
    create: { workId: id, ...data },
    update: data
  });

  return NextResponse.json({ profile });
}
