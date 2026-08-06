import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { submitPrivateProjectActionResult } from "@/lib/private-project-actions";

type RouteContext = {
  params: Promise<{ id: string; actionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id, actionId } = await context.params;

  if (!user) {
    return NextResponse.json({ message: "请先登录。", loginUrl: `/login?next=/me/projects/collaboration/${id}` }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await submitPrivateProjectActionResult(id, actionId, user, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    action: result.action,
    idempotent: result.idempotent
  });
}
