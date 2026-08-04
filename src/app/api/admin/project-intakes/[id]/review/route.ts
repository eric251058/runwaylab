import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/guards";
import { projectIntakeNextAction, projectIntakeTitle, reviewProjectIntakeAsAdmin } from "@/lib/start-projects";

type AdminProjectIntakeReviewRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: AdminProjectIntakeReviewRouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = await reviewProjectIntakeAsAdmin(id, admin, body);
  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    intake: {
      ...result.intake,
      title: projectIntakeTitle(result.intake),
      nextAction: projectIntakeNextAction(result.intake)
    },
    href: `/admin/project-intakes/${result.intake.id}`
  });
}
