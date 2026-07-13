import { NextResponse } from "next/server";
import { AiDiagnosisReviewStatus, AiDiagnosisStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { createAndRunWorkAiDiagnosis } from "@/lib/ai/work-diagnosis";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === UserRole.ADMIN;
}

export async function GET(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  const { id } = await context.params;
  const work = await prisma.work.findUnique({
    where: { id },
    select: { id: true, userId: true }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在。" }, { status: 404 });
  }

  const canViewAll = Boolean(currentUser && (isAdmin(currentUser) || currentUser.id === work.userId));
  const diagnoses = await prisma.workAiDiagnosis.findMany({
    where: canViewAll
      ? { workId: id }
      : {
          workId: id,
          status: AiDiagnosisStatus.COMPLETED,
          reviewStatus: AiDiagnosisReviewStatus.APPROVED
        },
    orderBy: { createdAt: "desc" },
    take: canViewAll ? 20 : 1
  });

  return NextResponse.json({
    diagnoses,
    canViewAll
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  const { id } = await context.params;

  if (!currentUser) {
    return NextResponse.json({ message: "请先登录后再申请 AI 诊断。" }, { status: 401 });
  }

  const result = await createAndRunWorkAiDiagnosis({
    workId: id,
    requestedById: currentUser.id,
    isAdmin: isAdmin(currentUser)
  });

  if (!result.allowed) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    diagnosis: result.diagnosis,
    message: result.warning ?? "AI 诊断已生成。"
  }, { status: result.warning ? 202 : 201 });
}
