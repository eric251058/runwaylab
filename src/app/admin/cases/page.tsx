import { CaseStudyStatus } from "@prisma/client";
import { saveCaseStudy } from "@/lib/commercial-collaboration-actions";
import { CASE_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  const [cases, works, projects, schools, teachers, providers] = await Promise.all([
    prisma.caseStudy.findMany({ include: { work: true, project: true, provider: true }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.work.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.collaborationProject.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.school.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.teacher.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, take: 200 })
  ]);
  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">成功案例管理</h1>
      </header>
      <form action={saveCaseStudy} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="title" required placeholder="案例标题" className={input} />
        <input name="slug" required placeholder="slug" className={input} />
        <input name="coverUrl" placeholder="封面 URL" className={input} />
        <select name="status" defaultValue={CaseStudyStatus.DRAFT} className={input}>{Object.values(CaseStudyStatus).map((status) => <option key={status} value={status}>{CASE_STATUS_LABELS[status]}</option>)}</select>
        <select name="workId" className={input}><option value="">作品</option>{works.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select name="projectId" className={input}><option value="">合作项目</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select name="schoolId" className={input}><option value="">学校</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="teacherId" className={input}><option value="">老师</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="providerId" className={input}><option value="">服务商</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input name="designerName" placeholder="设计师名，可选" className={input} />
        <input name="resultNote" placeholder="结果说明" className={input} />
        <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" />推荐</label>
        <textarea name="summary" placeholder="摘要" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <textarea name="content" placeholder="合作过程" className="min-h-28 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增案例</button>
      </form>
      <section className="mt-8 space-y-3">
        {cases.length ? cases.map((item) => (
          <form key={item.id} action={saveCaseStudy} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={item.id} />
            <input name="title" defaultValue={item.title} className={input} />
            <input name="slug" defaultValue={item.slug} className={input} />
            <select name="status" defaultValue={item.status} className={input}>{Object.values(CaseStudyStatus).map((status) => <option key={status} value={status}>{CASE_STATUS_LABELS[status]}</option>)}</select>
            <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={item.isFeatured} />推荐</label>
            <input name="coverUrl" defaultValue={item.coverUrl ?? ""} placeholder="封面" className={input} />
            <input name="designerName" defaultValue={item.designerName ?? ""} placeholder="设计师" className={input} />
            <input name="resultNote" defaultValue={item.resultNote ?? ""} placeholder="结果" className={input} />
            <input name="workId" defaultValue={item.workId ?? ""} placeholder="作品 ID" className={input} />
            <input name="projectId" defaultValue={item.projectId ?? ""} placeholder="项目 ID" className={input} />
            <input name="schoolId" defaultValue={item.schoolId ?? ""} placeholder="学校 ID" className={input} />
            <input name="teacherId" defaultValue={item.teacherId ?? ""} placeholder="老师 ID" className={input} />
            <input name="providerId" defaultValue={item.providerId ?? ""} placeholder="服务商 ID" className={input} />
            <textarea name="summary" defaultValue={item.summary ?? ""} className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <textarea name="content" defaultValue={item.content ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-4" />
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无案例。</div>}
      </section>
    </div>
  );
}
