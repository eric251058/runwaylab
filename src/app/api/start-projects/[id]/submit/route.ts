import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { projectIntakeNextAction, projectIntakeTitle, submitProjectIntakeReview } from "@/lib/start-projects";

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
  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    intake: {
      ...result.intake,
      title: projectIntakeTitle(result.intake),
      nextAction: projectIntakeNextAction(result.intake)
    },
    href: `/me/start-projects/${result.intake.id}`,
    idempotent: result.idempotent
  });
}
