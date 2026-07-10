import { NextResponse } from "next/server";
import { WorkVoteStatus, WorkVoteType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getContributionActorKey } from "@/lib/contribution-actor";
import { prisma } from "@/lib/prisma";
import { cleanPlainText } from "@/lib/user-contributions";
import { publicWorkWhere } from "@/lib/works/public";

const voteSchema = z.object({
  type: z.nativeEnum(WorkVoteType),
  voterName: z.string().trim().max(100).optional().nullable(),
  voterContact: z.string().trim().max(100).optional().nullable(),
  voterPersona: z.string().trim().max(100).optional().nullable()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "请选择一个有效判断。" }, { status: 400 });
  }

  const work = await prisma.work.findFirst({
    where: {
      id,
      ...publicWorkWhere
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ message: "作品不存在或暂不可参与判断。" }, { status: 404 });
  }

  const actorKey = await getContributionActorKey(user);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.workVote.findUnique({
    where: {
      workId_actorKey: {
        workId: id,
        actorKey
      }
    }
  });

  if (!existing) {
    const recentWorkCount = await prisma.workVote.count({
      where: {
        actorKey,
        createdAt: {
          gte: since
        }
      }
    });

    if (recentWorkCount >= 30) {
      return NextResponse.json({ message: "今天参与的作品较多，请稍后再试。" }, { status: 429 });
    }
  }

  const data = {
    workId: id,
    actorKey,
    type: parsed.data.type,
    voterName: cleanPlainText(parsed.data.voterName, 100) || null,
    voterContact: cleanPlainText(parsed.data.voterContact, 100) || null,
    voterPersona: cleanPlainText(parsed.data.voterPersona, 100) || null,
    status: WorkVoteStatus.ACTIVE,
    adminNote: null
  };

  await prisma.workVote.upsert({
    where: {
      workId_actorKey: {
        workId: id,
        actorKey
      }
    },
    create: data,
    update: {
      type: parsed.data.type,
      voterName: data.voterName,
      voterContact: data.voterContact,
      voterPersona: data.voterPersona,
      status: WorkVoteStatus.ACTIVE,
      adminNote: null
    }
  });

  return NextResponse.json({
    message: existing ? "你的判断已更新。" : "感谢你的判断。",
    selectedType: parsed.data.type
  }, { status: 201 });
}
