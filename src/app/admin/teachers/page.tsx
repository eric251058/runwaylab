import { saveTeacher } from "@/lib/school-activity-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTeachersPage() {
  const [teachers, schools] = await Promise.all([
    prisma.teacher.findMany({ include: { school: true, _count: { select: { recommendations: true } } }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] }),
    prisma.school.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">老师管理</h1>
      </header>

      <form action={saveTeacher} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="name" required placeholder="老师姓名" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="schoolId" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="">选择学校</option>
          {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
        <input name="title" placeholder="职称" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="department" placeholder="院系/方向" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="avatarUrl" placeholder="头像 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <textarea name="bio" placeholder="老师简介" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <input name="contact" placeholder="后台联系方式，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <select name="status" defaultValue="ACTIVE" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="HIDDEN">HIDDEN</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/60"><input name="isFeatured" type="checkbox" />推荐老师</label>
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">新增老师</button>
      </form>

      <section className="mt-8 space-y-3">
        {teachers.length ? teachers.map((teacher) => (
          <form key={teacher.id} action={saveTeacher} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={teacher.id} />
            <input name="name" defaultValue={teacher.name} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={teacher.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="schoolId" defaultValue={teacher.schoolId ?? ""} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="">未关联学校</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <select name="status" defaultValue={teacher.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
            <input name="title" defaultValue={teacher.title ?? ""} placeholder="职称" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="department" defaultValue={teacher.department ?? ""} placeholder="院系" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="avatarUrl" defaultValue={teacher.avatarUrl ?? ""} placeholder="头像 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="contact" defaultValue={teacher.contact ?? ""} placeholder="联系方式" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <textarea name="bio" defaultValue={teacher.bio ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={teacher.isFeatured} />推荐</label>
              <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            </div>
            <p className="text-xs text-ink/45 md:col-span-4">所属学校：{teacher.school?.name ?? "未关联"} / 推荐作品 {teacher._count.recommendations}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无老师。</div>}
      </section>
    </div>
  );
}
