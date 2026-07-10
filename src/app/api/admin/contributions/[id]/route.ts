import { NextResponse } from "next/server";
import { ContributionStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const updateContributionSchema = z.object({
  status: z.nativeEnum(ContributionStatus),
  adminNote: z.string().trim().max(500).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const parsed = updateContributionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "用户贡献处理参数不正确。" }, { status: 400 });
  }

  const contribution = await prisma.workContribution.update({
    where: {
      id
    },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote || null
    }
  });

  return NextResponse.json({ contribution });
}
