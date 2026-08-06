import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/guards";
import { cancelPrivateProjectAction } from "@/lib/private-project-actions";

type RouteContext = {
  params: Promise<{ id: string; actionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  const { id, actionId } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const result = await cancelPrivateProjectAction(id, actionId, admin, body);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: result.status });
  }

  return NextResponse.json({
    action: result.action,
    idempotent: result.idempotent
  });
}
