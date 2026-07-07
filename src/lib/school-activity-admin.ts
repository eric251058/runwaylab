"use server";

import { revalidatePath } from "next/cache";
import { ChallengeStatus, ExhibitionStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalDate, optionalText, requiredText, splitIds } from "@/lib/school-activity";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    throw new Error("没有后台权限");
  }
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function statusValue(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function saveSchool(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const data = {
    name: requiredText(formData.get("name"), "学校名称"),
    slug: optionalText(formData.get("slug")),
    city: optionalText(formData.get("city")),
    logoUrl: optionalText(formData.get("logoUrl")),
    coverUrl: optionalText(formData.get("coverUrl")),
    description: optionalText(formData.get("description")),
    website: optionalText(formData.get("website")),
    status: statusValue(formData.get("status"), "ACTIVE"),
    isFeatured: boolValue(formData, "isFeatured")
  };

  if (id) {
    await prisma.school.update({ where: { id }, data });
  } else {
    await prisma.school.create({ data });
  }

  revalidatePath("/schools");
  revalidatePath("/admin/schools");
}

export async function saveTeacher(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const schoolId = optionalText(formData.get("schoolId"));
  const data = {
    schoolId,
    name: requiredText(formData.get("name"), "老师姓名"),
    slug: optionalText(formData.get("slug")),
    title: optionalText(formData.get("title")),
    department: optionalText(formData.get("department")),
    avatarUrl: optionalText(formData.get("avatarUrl")),
    bio: optionalText(formData.get("bio")),
    contact: optionalText(formData.get("contact")),
    status: statusValue(formData.get("status"), "ACTIVE"),
    isFeatured: boolValue(formData, "isFeatured")
  };

  if (id) {
    await prisma.teacher.update({ where: { id }, data });
  } else {
    await prisma.teacher.create({ data });
  }

  revalidatePath("/teachers");
  revalidatePath("/admin/teachers");
}

export async function saveExhibition(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const workIds = splitIds(formData.get("workIds"));
  const data = {
    schoolId: optionalText(formData.get("schoolId")),
    teacherId: optionalText(formData.get("teacherId")),
    title: requiredText(formData.get("title"), "展览标题"),
    slug: optionalText(formData.get("slug")),
    type: optionalText(formData.get("type")) ?? "课程作品展",
    coverUrl: optionalText(formData.get("coverUrl")),
    description: optionalText(formData.get("description")),
    startDate: optionalDate(formData.get("startDate")),
    endDate: optionalDate(formData.get("endDate")),
    status: statusValue(formData.get("status"), ExhibitionStatus.DRAFT) as ExhibitionStatus,
    isFeatured: boolValue(formData, "isFeatured")
  };

  const exhibition = id ? await prisma.exhibition.update({ where: { id }, data }) : await prisma.exhibition.create({ data });

  await prisma.exhibitionWork.deleteMany({ where: { exhibitionId: exhibition.id } });
  if (workIds.length) {
    await prisma.exhibitionWork.createMany({
      data: workIds.map((workId, index) => ({ exhibitionId: exhibition.id, workId, sortOrder: index })),
      skipDuplicates: true
    });
  }

  revalidatePath("/exhibitions");
  revalidatePath("/admin/exhibitions");
}

export async function saveChallenge(formData: FormData) {
  await requireAdmin();
  const id = optionalText(formData.get("id"));
  const workIds = splitIds(formData.get("workIds"));
  const data = {
    schoolId: optionalText(formData.get("schoolId")),
    teacherId: optionalText(formData.get("teacherId")),
    title: requiredText(formData.get("title"), "挑战赛标题"),
    slug: optionalText(formData.get("slug")),
    theme: optionalText(formData.get("theme")) ?? "设计挑战",
    coverUrl: optionalText(formData.get("coverUrl")),
    description: optionalText(formData.get("description")) ?? "挑战赛简介待补充",
    requirements: optionalText(formData.get("requirements")) ?? "规则待补充",
    rewards: optionalText(formData.get("rewards")) ?? "机会待补充",
    startAt: optionalDate(formData.get("startAt")) ?? new Date(),
    endAt: optionalDate(formData.get("endAt")) ?? new Date(),
    status: statusValue(formData.get("status"), ChallengeStatus.DRAFT) as ChallengeStatus,
    isFeatured: boolValue(formData, "isFeatured")
  };

  const challenge = id ? await prisma.challenge.update({ where: { id }, data }) : await prisma.challenge.create({ data });

  await prisma.challengeWork.deleteMany({ where: { challengeId: challenge.id } });
  if (workIds.length) {
    await prisma.challengeWork.createMany({
      data: workIds.map((workId, index) => ({ challengeId: challenge.id, workId, sortOrder: index })),
      skipDuplicates: true
    });
  }

  revalidatePath("/challenges");
  revalidatePath("/admin/challenges");
}

export async function saveRecommendation(formData: FormData) {
  await requireAdmin();
  const teacherId = optionalText(formData.get("teacherId"));
  const workId = requiredText(formData.get("workId"), "作品 ID");
  const teacher = teacherId ? await prisma.teacher.findUnique({ where: { id: teacherId } }) : null;

  await prisma.teacherRecommendedWork.create({
    data: {
      teacherId,
      workId,
      note: optionalText(formData.get("note")),
      tag: optionalText(formData.get("tag"))
    }
  });

  if (teacher) {
    await prisma.work.update({
      where: { id: workId },
      data: {
        teacherId: teacher.id,
        schoolId: teacher.schoolId ?? undefined
      }
    });
  }

  revalidatePath("/teachers");
  revalidatePath("/works");
  revalidatePath("/admin/recommendations");
}
