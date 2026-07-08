import { CollaborationProjectPriority, CollaborationProjectStatus } from "@prisma/client";
import { saveCollaborationProject } from "@/lib/commercial-collaboration-actions";
import { dateInputValue, PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const [projects, works, providers, fabrics, campaigns, schools, teachers] = await Promise.all([
    prisma.collaborationProject.findMany({ include: { work: true, provider: true }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.work.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.fabric.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.presaleCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.school.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.teacher.findMany({ orderBy: { name: "asc" }, take: 200 })
  ]);

  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";
  const workOptions = works.map((work) => <option key={work.id} value={work.id}>{work.title} / {work.user.nickname}</option>);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">合作项目管理</h1>
      </header>

      <form action={saveCollaborationProject} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <input name="title" required placeholder="项目标题" className={input} />
        <input name="slug" placeholder="slug，可选" className={input} />
        <select name="workId" required className={input}><option value="">选择作品</option>{workOptions}</select>
        <select name="providerId" className={input}><option value="">服务商，可选</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="fabricId" className={input}><option value="">面料，可选</option>{fabrics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="presaleCampaignId" className={input}><option value="">预售活动，可选</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select name="schoolId" className={input}><option value="">学校，可选</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="teacherId" className={input}><option value="">老师，可选</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="status" defaultValue={CollaborationProjectStatus.DRAFT} className={input}>{Object.values(CollaborationProjectStatus).map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}</select>
        <select name="priority" defaultValue={CollaborationProjectPriority.NORMAL} className={input}>{Object.values(CollaborationProjectPriority).map((priority) => <option key={priority} value={priority}>{PROJECT_PRIORITY_LABELS[priority]}</option>)}</select>
        <input name="targetQuantity" placeholder="目标数量说明" className={input} />
        <input name="estimatedBudget" placeholder="预算说明" className={input} />
        <input name="targetLaunchDate" type="date" className={input} />
        <input name="designerId" placeholder="设计师用户 ID，可选" className={input} />
        <textarea name="description" placeholder="项目说明" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <textarea name="internalNote" placeholder="内部备注" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增合作项目</button>
      </form>

      <section className="mt-8 space-y-3">
        {projects.length ? projects.map((project) => (
          <form key={project.id} action={saveCollaborationProject} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={project.id} />
            <input name="title" defaultValue={project.title} className={input} />
            <input name="slug" defaultValue={project.slug ?? ""} placeholder="slug" className={input} />
            <select name="workId" defaultValue={project.workId} className={input}>{workOptions}</select>
            <select name="providerId" defaultValue={project.providerId ?? ""} className={input}><option value="">服务商</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select name="status" defaultValue={project.status} className={input}>{Object.values(CollaborationProjectStatus).map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}</select>
            <select name="priority" defaultValue={project.priority} className={input}>{Object.values(CollaborationProjectPriority).map((priority) => <option key={priority} value={priority}>{PROJECT_PRIORITY_LABELS[priority]}</option>)}</select>
            <input name="targetQuantity" defaultValue={project.targetQuantity ?? ""} placeholder="目标数量" className={input} />
            <input name="estimatedBudget" defaultValue={project.estimatedBudget ?? ""} placeholder="预算" className={input} />
            <input name="targetLaunchDate" type="date" defaultValue={dateInputValue(project.targetLaunchDate)} className={input} />
            <input name="designerId" defaultValue={project.designerId ?? ""} placeholder="设计师 ID" className={input} />
            <select name="fabricId" defaultValue={project.fabricId ?? ""} className={input}><option value="">面料</option>{fabrics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select name="presaleCampaignId" defaultValue={project.presaleCampaignId ?? ""} className={input}><option value="">预售活动</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <select name="schoolId" defaultValue={project.schoolId ?? ""} className={input}><option value="">学校</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select name="teacherId" defaultValue={project.teacherId ?? ""} className={input}><option value="">老师</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <textarea name="description" defaultValue={project.description ?? ""} className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">作品：{project.work.title} / 服务商：{project.provider?.name ?? "待关联"}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无合作项目。</div>}
      </section>
    </div>
  );
}
