import { saveSchool } from "@/lib/school-activity-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { teachers: true, works: true } }
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">学校管理</h1>
      </header>

      <form action={saveSchool} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="name" required placeholder="学校名称" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="slug" placeholder="slug，可选" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="city" placeholder="城市" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="logoUrl" placeholder="Logo URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm" />
        <input name="coverUrl" placeholder="封面 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <input name="website" placeholder="官网 URL" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
        <textarea name="description" placeholder="学校简介" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <select name="status" defaultValue="ACTIVE" className="h-11 rounded-[6px] border border-black/10 px-3 text-sm">
          <option value="ACTIVE">ACTIVE</option>
          <option value="HIDDEN">HIDDEN</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/60">
          <input name="isFeatured" type="checkbox" />
          推荐学校
        </label>
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增学校</button>
      </form>

      <section className="mt-8 space-y-3">
        {schools.length ? schools.map((school) => (
          <form key={school.id} action={saveSchool} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-[1fr_1fr_120px_110px]">
            <input type="hidden" name="id" value={school.id} />
            <input name="name" defaultValue={school.name} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="slug" defaultValue={school.slug ?? ""} placeholder="slug" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <select name="status" defaultValue={school.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
              <option value="ACTIVE">ACTIVE</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={school.isFeatured} />推荐</label>
            <input name="city" defaultValue={school.city ?? ""} placeholder="城市" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="logoUrl" defaultValue={school.logoUrl ?? ""} placeholder="Logo URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm" />
            <input name="coverUrl" defaultValue={school.coverUrl ?? ""} placeholder="封面 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <input name="website" defaultValue={school.website ?? ""} placeholder="官网 URL" className="h-10 rounded-[6px] border border-black/10 px-3 text-sm md:col-span-2" />
            <textarea name="description" defaultValue={school.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">老师 {school._count.teachers} / 作品 {school._count.works}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无学校。</div>}
      </section>
    </div>
  );
}
