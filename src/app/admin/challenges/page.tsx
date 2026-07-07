import { ChallengeStatus } from "@prisma/client";
import { saveChallenge } from "@/lib/school-activity-admin";
import { displayDateRange } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const [challenges, schools, teachers] = await Promise.all([
    prisma.challenge.findMany({ include: { school: true, teacher: true, _count: { select: { works: true, entries: true } } }, orderBy: [{ createdAt: "desc" }] }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">挑战赛管理</h1>
      </header>

      <form action={saveChallenge} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="title" required placeholder="挑战赛标题" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="theme" placeholder="主题" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="coverUrl" placeholder="封面 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="schoolId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择学校</option>
          {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
        <select name="teacherId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择老师</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <input name="startAt" type="date" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="endAt" type="date" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="status" defaultValue={ChallengeStatus.DRAFT} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          {Object.values(ChallengeStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/60"><input name="isFeatured" type="checkbox" />推荐挑战</label>
        <textarea name="description" placeholder="挑战赛简介" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <textarea name="requirements" placeholder="主题说明/规则" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
        <textarea name="rewards" placeholder="机会与奖励" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
        <textarea name="workIds" placeholder="关联作品 ID，逗号或换行分隔" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增挑战赛</button>
      </form>

      <section className="mt-8 space-y-3">
        {challenges.length ? challenges.map((challenge) => (
          <form key={challenge.id} action={saveChallenge} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={challenge.id} />
            <input name="title" defaultValue={challenge.title} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={challenge.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="schoolId" defaultValue={challenge.schoolId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联学校</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <select name="teacherId" defaultValue={challenge.teacherId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联老师</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            <input name="theme" defaultValue={challenge.theme} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="coverUrl" defaultValue={challenge.coverUrl ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="startAt" type="date" defaultValue={challenge.startAt.toISOString().slice(0, 10)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="endAt" type="date" defaultValue={challenge.endAt.toISOString().slice(0, 10)} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="status" defaultValue={challenge.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              {Object.values(ChallengeStatus).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={challenge.isFeatured} />推荐</label>
            <textarea name="description" defaultValue={challenge.description} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
            <textarea name="requirements" defaultValue={challenge.requirements} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
            <textarea name="rewards" defaultValue={challenge.rewards} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
            <textarea name="workIds" placeholder="保存时会重置关联作品，请填作品 ID" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">{displayDateRange(challenge.startAt, challenge.endAt)} / 作品 {challenge._count.works + challenge._count.entries}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无挑战赛。</div>}
      </section>
    </div>
  );
}
