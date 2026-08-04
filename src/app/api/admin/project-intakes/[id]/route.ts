import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/guards";
import { getProjectIntakeForAdmin, projectIntakeNextAction, projectIntakeTitle } from "@/lib/start-projects";

type AdminProjectIntakeRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: AdminProjectIntakeRouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const intake = await getProjectIntakeForAdmin(id, admin);
  if (!intake) {
    return NextResponse.json({ message: "项目不存在。" }, { status: 404 });
  }

  return NextResponse.json({
    intake: {
      ...intake,
      title: projectIntakeTitle(intake),
      nextAction: projectIntakeNextAction(intake)
    }
  });
}
