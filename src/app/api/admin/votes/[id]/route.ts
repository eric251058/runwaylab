import { NextResponse } from "next/server";
import { WorkVoteStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { cleanPlainText } from "@/lib/user-contributions";

const updateVoteSchema = z.object({
  status: z.nativeEnum(WorkVoteStatus),
  adminNote: z.string().max(500).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdminUser();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const parsed = updateVoteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "投票处理参数不正确。" }, { status: 400 });
  }

  const vote = await prisma.workVote.update({
    where: {
      id
    },
    data: {
      status: parsed.data.status,
      adminNote: cleanPlainText(parsed.data.adminNote, 500) || null
    }
  }).catch(() => null);

  if (!vote) {
    return NextResponse.json({ message: "投票不存在或暂时无法更新。" }, { status: 404 });
  }

  return NextResponse.json({ vote });
}
