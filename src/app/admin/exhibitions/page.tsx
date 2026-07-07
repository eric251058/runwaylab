import { ExhibitionStatus } from "@prisma/client";
import { saveExhibition } from "@/lib/school-activity-admin";
import { displayDateRange } from "@/lib/school-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminExhibitionsPage() {
  const [exhibitions, schools, teachers] = await Promise.all([
    prisma.exhibition.findMany({ include: { school: true, teacher: true, _count: { select: { works: true } } }, orderBy: [{ createdAt: "desc" }] }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">作品展管理</h1>
      </header>

      <form action={saveExhibition} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="title" required placeholder="展览标题" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="type" placeholder="类型，如课程作品展/毕业设计展" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="coverUrl" placeholder="封面 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="schoolId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择学校</option>
          {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
        <select name="teacherId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择老师</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <input name="startDate" type="date" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="endDate" type="date" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="status" defaultValue={ExhibitionStatus.DRAFT} className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          {Object.values(ExhibitionStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/60"><input name="isFeatured" type="checkbox" />推荐展览</label>
        <textarea name="description" placeholder="展览简介" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <textarea name="workIds" placeholder="关联作品 ID，逗号或换行分隔" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增作品展</button>
      </form>

      <section className="mt-8 space-y-3">
        {exhibitions.length ? exhibitions.map((exhibition) => (
          <form key={exhibition.id} action={saveExhibition} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={exhibition.id} />
            <input name="title" defaultValue={exhibition.title} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={exhibition.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="schoolId" defaultValue={exhibition.schoolId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联学校</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <select name="teacherId" defaultValue={exhibition.teacherId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联老师</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            <input name="type" defaultValue={exhibition.type} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="coverUrl" defaultValue={exhibition.coverUrl ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="startDate" type="date" defaultValue={exhibition.startDate?.toISOString().slice(0, 10) ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="endDate" type="date" defaultValue={exhibition.endDate?.toISOString().slice(0, 10) ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="status" defaultValue={exhibition.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              {Object.values(ExhibitionStatus).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={exhibition.isFeatured} />推荐</label>
            <textarea name="description" defaultValue={exhibition.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
            <textarea name="workIds" placeholder="保存时会重置关联作品，请填作品 ID" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-3">{displayDateRange(exhibition.startDate, exhibition.endDate)} / 作品 {exhibition._count.works}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无作品展。</div>}
      </section>
    </div>
  );
}
