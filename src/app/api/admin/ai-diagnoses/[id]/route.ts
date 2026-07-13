import { NextResponse } from "next/server";
import { AiDiagnosisReviewStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/guards";
import { createAndRunWorkAiDiagnosis } from "@/lib/ai/work-diagnosis";
import { prisma } from "@/lib/prisma";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("needsRevision"), adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("reject"), adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("note"), adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("regenerate") })
]);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanNote(value?: string) {
  return value?.replace(/<[^>]*>/g, "").trim().slice(0, 500) || null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "AI 诊断操作参数不正确。" }, { status: 400 });
  }

  const diagnosis = await prisma.workAiDiagnosis.findUnique({
    where: { id },
    select: { id: true, workId: true }
  });

  if (!diagnosis) {
    return NextResponse.json({ message: "诊断记录不存在。" }, { status: 404 });
  }

  const action = parsed.data;

  if (action.action === "regenerate") {
    const result = await createAndRunWorkAiDiagnosis({
      workId: diagnosis.workId,
      requestedById: admin.id,
      isAdmin: true
    });

    if (!result.allowed) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      diagnosis: result.diagnosis,
      message: result.warning ?? "已重新生成 AI 诊断。"
    }, { status: result.warning ? 202 : 201 });
  }

  const reviewStatus =
    action.action === "approve"
      ? AiDiagnosisReviewStatus.APPROVED
      : action.action === "needsRevision"
        ? AiDiagnosisReviewStatus.NEEDS_REVISION
        : action.action === "reject"
          ? AiDiagnosisReviewStatus.REJECTED
          : undefined;

  const updated = await prisma.workAiDiagnosis.update({
    where: { id },
    data: {
      ...(reviewStatus ? { reviewStatus, reviewedById: admin.id } : {}),
      adminNote: cleanNote(action.adminNote)
    }
  });

  return NextResponse.json({ diagnosis: updated });
}
