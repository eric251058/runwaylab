import { ReviewStatus, ReviewTargetType } from "@prisma/client";
import { saveReview } from "@/lib/commercial-collaboration-actions";
import { REVIEW_STATUS_LABELS, REVIEW_TARGET_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const [reviews, users, providers, works, projects] = await Promise.all([
    prisma.review.findMany({ include: { reviewer: true, provider: true, work: true, project: true, targetUser: true }, orderBy: { createdAt: "desc" }, take: 160 }),
    prisma.user.findMany({ orderBy: { nickname: "asc" }, take: 200 }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.work.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.collaborationProject.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
  ]);
  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">评价管理</h1>
      </header>
      <form action={saveReview} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="targetType" defaultValue={ReviewTargetType.PROJECT} className={input}>{Object.values(ReviewTargetType).map((type) => <option key={type} value={type}>{REVIEW_TARGET_LABELS[type]}</option>)}</select>
        <select name="status" defaultValue={ReviewStatus.PENDING} className={input}>{[ReviewStatus.PENDING, ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN].map((status) => <option key={status} value={status}>{REVIEW_STATUS_LABELS[status]}</option>)}</select>
        <select name="reviewerId" className={input}><option value="">评价人（默认当前管理员）</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nickname}</option>)}</select>
        <input name="rating" type="number" min={1} max={5} defaultValue={5} className={input} />
        <select name="targetUserId" className={input}><option value="">目标用户</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nickname}</option>)}</select>
        <select name="providerId" className={input}><option value="">服务商</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
        <select name="workId" className={input}><option value="">作品</option>{works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select>
        <select name="projectId" className={input}><option value="">项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
        <textarea name="content" placeholder="评价内容" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增评价</button>
      </form>
      <section className="mt-8 space-y-3">
        {reviews.length ? reviews.map((review) => (
          <form key={review.id} action={saveReview} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={review.id} />
            <select name="targetType" defaultValue={review.targetType} className={input}>{Object.values(ReviewTargetType).map((type) => <option key={type} value={type}>{REVIEW_TARGET_LABELS[type]}</option>)}</select>
            <select name="status" defaultValue={review.status} className={input}>{[ReviewStatus.PENDING, ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN].map((status) => <option key={status} value={status}>{REVIEW_STATUS_LABELS[status]}</option>)}</select>
            <input name="rating" type="number" min={1} max={5} defaultValue={review.rating} className={input} />
            <input name="reviewerId" defaultValue={review.reviewerId} className={input} />
            <input name="targetUserId" defaultValue={review.targetUserId ?? ""} placeholder="目标用户 ID" className={input} />
            <input name="providerId" defaultValue={review.providerId ?? ""} placeholder="服务商 ID" className={input} />
            <input name="workId" defaultValue={review.workId ?? ""} placeholder="作品 ID" className={input} />
            <input name="projectId" defaultValue={review.projectId ?? ""} placeholder="项目 ID" className={input} />
            <textarea name="content" defaultValue={review.content ?? ""} className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">评价人：{review.reviewer.nickname} / 目标：{review.provider?.name ?? review.work?.title ?? review.project?.title ?? review.targetUser?.nickname ?? "待关联"}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无评价。</div>}
      </section>
    </div>
  );
}
