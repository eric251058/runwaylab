import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus, IncubationApplicationStatus, IncubationSource, IncubationStatus, ReviewStatus } from "@prisma/client";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const adminWorkActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), rejectReason: z.string().min(2).max(500) }),
  z.object({ action: z.literal("offline") }),
  z.object({ action: z.literal("feature"), value: z.boolean().default(true) }),
  z.object({ action: z.literal("editorPick"), value: z.boolean().default(true) }),
  z.object({ action: z.literal("incubationCandidate"), adminNote: z.string().max(500).optional() })
]);

type AdminWorkRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: AdminWorkRouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const parsed = adminWorkActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "审核操作参数不正确。" }, { status: 400 });
  }

  const now = new Date();
  const action = parsed.data;

  const work = await prisma.$transaction(async (tx) => {
    if (action.action === "approve") {
      return tx.work.update({
        where: { id },
        data: {
          reviewStatus: ReviewStatus.APPROVED,
          rejectReason: null,
          handledById: admin.id,
          handledAt: now
        }
      });
    }

    if (action.action === "reject") {
      return tx.work.update({
        where: { id },
        data: {
          reviewStatus: ReviewStatus.REJECTED,
          rejectReason: action.rejectReason,
          handledById: admin.id,
          handledAt: now
        }
      });
    }

    if (action.action === "offline") {
      return tx.work.update({
        where: { id },
        data: {
          reviewStatus: ReviewStatus.OFFLINE,
          contentStatus: ContentStatus.OFFLINE,
          handledById: admin.id,
          handledAt: now
        }
      });
    }

    if (action.action === "feature") {
      return tx.work.update({
        where: { id },
        data: {
          isFeatured: action.value
        }
      });
    }

    if (action.action === "editorPick") {
      return tx.work.update({
        where: { id },
        data: {
          isEditorPick: action.value
        }
      });
    }

    const existing = await tx.incubationApplication.findFirst({
      where: {
        workId: id,
        status: {
          in: [IncubationApplicationStatus.CANDIDATE, IncubationApplicationStatus.REVIEWING]
        }
      }
    });

    const targetWork = await tx.work.update({
      where: { id },
      data: {
        incubationStatus: IncubationStatus.CANDIDATE,
        wantsIncubation: true
      }
    });

    if (!existing) {
      await tx.incubationApplication.create({
        data: {
          userId: targetWork.userId,
          workId: id,
          source: IncubationSource.ADMIN,
          status: IncubationApplicationStatus.CANDIDATE,
          adminNote: action.adminNote,
          handledById: admin.id,
          handledAt: now
        }
      });
    }

    return targetWork;
  });

  return NextResponse.json({ work });
}
