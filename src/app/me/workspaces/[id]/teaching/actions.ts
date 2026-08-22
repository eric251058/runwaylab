"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/workspace-permissions";

const noteSchema = z.object({
  workspaceId: z.string().cuid(),
  workId: z.string().cuid(),
  tag: z.string().trim().max(30).optional(),
  note: z.string().trim().min(2).max(500)
});

export async function saveWorkspaceTeachingNote(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录。");
  const parsed = noteSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    workId: formData.get("workId"),
    tag: formData.get("tag") || undefined,
    note: formData.get("note")
  });
  if (!parsed.success) throw new Error("请检查指导内容。");

  const { workspaceId, workId, tag, note } = parsed.data;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: { userId: user.id },
        select: { role: true, status: true },
        take: 1
      }
    }
  });
  const access = workspace?.members[0] ?? null;
  if (!(user.role === "ADMIN" || workspace?.ownerId === user.id || canManageWorkspace(access))) {
    throw new Error("没有权限添加空间指导。");
  }
  const work = await prisma.work.findFirst({ where: { id: workId, workspaceId }, select: { id: true } });
  if (!work) throw new Error("作品不属于当前空间。");

  await prisma.teacherRecommendedWork.create({ data: { workId, tag: tag || "空间指导", note } });
  revalidatePath(`/me/workspaces/${workspaceId}/teaching`);
}
