import { NextResponse } from "next/server";
import { requireAdminResponse } from "@/lib/auth/guards";

export async function GET() {
  const blocked = await requireAdminResponse();

  if (blocked) {
    return blocked;
  }

  return NextResponse.json({
    message: "Admin dashboard API placeholder."
  });
}
