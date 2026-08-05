import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { convertProjectIntakeToProject, privateCollaborationProjectHref, projectIntakeTitle } from "@/lib/start-projects";

type AdminProjectIntakeConvertRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: AdminProjectIntakeConvertRouteContext) {
  const admin = await getCurrentUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await convertProjectIntakeToProject(id, admin, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    intake: {
      ...result.intake,
      title: projectIntakeTitle(result.intake)
    },
    project: result.project,
    href: privateCollaborationProjectHref(result.project.id),
    idempotent: result.idempotent
  });
}
