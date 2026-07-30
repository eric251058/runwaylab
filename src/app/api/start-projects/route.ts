import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createProjectIntakeForUser, getProjectIntakesForUser, projectIntakeNextAction, projectIntakeTitle } from "@/lib/start-projects";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录。", loginUrl: "/login?next=/start" }, { status: 401 });
  }

  const items = await getProjectIntakesForUser(user.id);
  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      title: projectIntakeTitle(item),
      nextAction: projectIntakeNextAction(item)
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录后创建项目。", loginUrl: "/login?next=/start" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await createProjectIntakeForUser(user.id, body);

  if (!result.ok) {
    console.info("Project intake create rejected", {
      route: "/api/start-projects",
      userId: user.id,
      reason: "validation"
    });
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return NextResponse.json({
    intake: {
      ...result.intake,
      title: projectIntakeTitle(result.intake),
      nextAction: projectIntakeNextAction(result.intake)
    },
    href: `/me/start-projects/${result.intake.id}`
  });
}
