import { NextResponse } from "next/server";
import { ContentStatus, WorkIncubationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const editorialTypes = new Set(["HOME_FEATURED", "EDITOR_PICK", "HOT_WORK", "PRESALE_PICK", "INCUBATION_PICK"]);
const moderationTypes = new Set(["HIDDEN", "VIOLATION"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "没有后台权限" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const workId = typeof body?.workId === "string" ? body.workId : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const enabled = body?.enabled !== false;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!workId || (!editorialTypes.has(type) && !moderationTypes.has(type))) {
    return NextResponse.json({ error: "参数不正确" }, { status: 400 });
  }

  const work = await prisma.work.findUnique({
    where: {
      id: workId
    },
    select: {
      id: true
    }
  });

  if (!work) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  if (type === "HOME_FEATURED") {
    await prisma.work.update({ where: { id: workId }, data: { isFeatured: enabled } });
  }

  if (type === "EDITOR_PICK") {
    await prisma.work.update({ where: { id: workId }, data: { isEditorPick: enabled } });
  }

  if (type === "INCUBATION_PICK" && enabled) {
    await prisma.workIncubation.upsert({
      where: {
        workId
      },
      create: {
        workId,
        status: WorkIncubationStatus.CANDIDATE,
        adminNote: note || null
      },
      update: {
        status: WorkIncubationStatus.CANDIDATE,
        adminNote: note || undefined
      }
    });
  }

  if (type === "HIDDEN") {
    await prisma.work.update({
      where: {
        id: workId
      },
      data: {
        contentStatus: enabled ? ContentStatus.HIDDEN : ContentStatus.VISIBLE,
        adminNote: note || undefined
      }
    });
  }

  if (type === "VIOLATION") {
    await prisma.work.update({
      where: {
        id: workId
      },
      data: {
        contentStatus: ContentStatus.HIDDEN,
        adminNote: note || "运营标记：违规作品"
      }
    });
  }

  if (editorialTypes.has(type)) {
    if (enabled) {
      await prisma.editorialPick.upsert({
        where: {
          workId_type: {
            workId,
            type
          }
        },
        create: {
          workId,
          type,
          note: note || null
        },
        update: {
          note: note || null
        }
      });
    } else {
      await prisma.editorialPick.deleteMany({
        where: {
          workId,
          type
        }
      });
    }
  }

  return NextResponse.json({ ok: true });
}
