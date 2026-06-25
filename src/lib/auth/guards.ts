import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    return null;
  }

  return user;
}

export async function requireAdminResponse() {
  const user = await requireAdminUser();

  if (!user) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  return null;
}
