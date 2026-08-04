import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/guards";
import { getAdminProjectIntakes, normalizeProjectIntakeAdminFilter, projectIntakeNextAction, projectIntakeTitle } from "@/lib/start-projects";

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter = normalizeProjectIntakeAdminFilter(url.searchParams.get("filter"));
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
  const result = await getAdminProjectIntakes({ filter, page, pageSize });

  return NextResponse.json({
    ...result,
    items: result.items.map((item) => ({
      ...item,
      title: projectIntakeTitle(item),
      nextAction: projectIntakeNextAction(item)
    }))
  });
}
