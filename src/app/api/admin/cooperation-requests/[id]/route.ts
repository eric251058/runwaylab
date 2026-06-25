import { RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.nativeEnum(RequestStatus),
  adminNote: z.string().max(1000).optional()
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "状态参数不正确。" }, { status: 400 });
  }

  const item = await prisma.cooperationRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      handledAt: new Date(),
      handledById: admin.id
    }
  });

  return NextResponse.json({ request: item });
}
