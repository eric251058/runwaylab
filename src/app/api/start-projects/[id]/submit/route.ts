import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { privateCollaborationProjectHref, projectIntakeNextAction, projectIntakeTitle, submitProjectIntakeReview } from "@/lib/start-projects";

type StartProjectSubmitRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: StartProjectSubmitRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。", loginUrl: `/login?next=/me/start-projects/${id}` }, { status: 401 });
  }

  const result = await submitProjectIntakeReview(id, user);
  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  const success = result as {
    intake: Parameters<typeof projectIntakeTitle>[0] & Parameters<typeof projectIntakeNextAction>[0] & { id: string };
    project?: { id: string } | null;
    idempotent?: boolean;
  };

  return NextResponse.json({
    intake: {
      ...success.intake,
      title: projectIntakeTitle(success.intake),
      nextAction: projectIntakeNextAction(success.intake)
    },
    project: success.project ?? null,
    href: success.project ? privateCollaborationProjectHref(success.project.id) : `/me/start-projects/${success.intake.id}`,
    idempotent: success.idempotent
  });
}
