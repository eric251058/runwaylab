import { NextResponse } from "next/server";
import { WorkDemandIntentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { demandSummary } from "@/lib/demand/rules";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await isFeatureEnabled("feature.demand_v21"))) {
    return NextResponse.json({ demands: [], enabled: false });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const demands = await prisma.workDemandIntent.findMany({
    where: {
      userId: user.id,
      status: WorkDemandIntentStatus.ACTIVE
    },
    include: {
      work: {
        select: {
          id: true,
          title: true,
          user: { select: { nickname: true } },
          images: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" }, take: 1 }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    enabled: true,
    demands: demands.map((demand) => ({
      id: demand.id,
      workId: demand.workId,
      workTitle: demand.work.title,
      designerName: demand.work.user.nickname,
      imageUrl: demand.work.images[0]?.imageUrl ?? null,
      summary: demandSummary(demand),
      createdAt: demand.createdAt,
      updatedAt: demand.updatedAt
    }))
  });
}
