import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjectIntakeForViewer, projectIntakeNextAction, projectIntakeTitle, updateProjectIntakeForViewer } from "@/lib/start-projects";

type StartProjectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: StartProjectRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。", loginUrl: `/login?next=/me/start-projects/${id}` }, { status: 401 });
  }

  const intake = await getProjectIntakeForViewer(id, user);
  if (!intake) {
    return NextResponse.json({ message: "启动草稿不存在或无权查看。" }, { status: 404 });
  }

  return NextResponse.json({
    intake: {
      ...intake,
      title: projectIntakeTitle(intake),
      nextAction: projectIntakeNextAction(intake)
    }
  });
}

export async function PATCH(request: Request, context: StartProjectRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。", loginUrl: `/login?next=/me/start-projects/${id}` }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await updateProjectIntakeForViewer(id, user, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    intake: {
      ...result.intake,
      title: projectIntakeTitle(result.intake),
      nextAction: projectIntakeNextAction(result.intake)
    }
  });
}
