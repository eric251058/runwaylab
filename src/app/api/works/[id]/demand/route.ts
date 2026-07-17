import { NextResponse } from "next/server";
import { WorkDemandIntentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeDemandInput } from "@/lib/demand/rules";
import { isFeatureEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getWorkById } from "@/lib/works/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function disabledResponse() {
  return NextResponse.json({ error: "需求意向功能尚未开放。" }, { status: 404 });
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.demand_v21"))) return disabledResponse();
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const demand = await prisma.workDemandIntent.findUnique({
    where: {
      workId_userId: {
        workId: id,
        userId: user.id
      }
    }
  });

  return NextResponse.json({ demand });
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.demand_v21"))) return disabledResponse();
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const limit = checkRateLimit(`work-demand:${user.id}:1h`, { windowMs: 60 * 60 * 1000, limit: 20 });
  if (limit.limited) {
    return NextResponse.json({ error: "提交太频繁，请稍后再试。" }, { status: 429 });
  }

  const work = await getWorkById(id);
  if (!work) {
    return NextResponse.json({ error: "作品暂时不可提交需求意向。" }, { status: 404 });
  }

  const normalized = normalizeDemandInput((await request.json().catch(() => ({}))) as Record<string, unknown>);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const demand = await prisma.workDemandIntent.upsert({
    where: {
      workId_userId: {
        workId: id,
        userId: user.id
      }
    },
    create: {
      workId: id,
      userId: user.id,
      ...normalized.data
    },
    update: {
      ...normalized.data,
      status: WorkDemandIntentStatus.ACTIVE
    }
  });

  return NextResponse.json({ demand });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.demand_v21"))) return disabledResponse();
  return POST(request, context);
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("feature.demand_v21"))) return disabledResponse();
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  await prisma.workDemandIntent.updateMany({
    where: {
      workId: id,
      userId: user.id
    },
    data: {
      status: WorkDemandIntentStatus.CANCELLED
    }
  });

  return NextResponse.json({ ok: true });
}
