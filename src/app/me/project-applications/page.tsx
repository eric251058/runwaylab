import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { reviewProjectApplication, withdrawProjectApplication } from "@/lib/project-application-actions";
import { PROJECT_APPLICATION_ROLE_LABELS, PROJECT_APPLICATION_STATUS_LABELS } from "@/lib/project-applications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function ProjectApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/project-applications");

  const [submitted, pendingReview] = await Promise.all([
    prisma.projectApplication.findMany({
      where: { applicantId: user.id },
      include: {
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            workspace: { select: { slug: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.projectApplication.findMany({
      where: {
        status: "PENDING",
        project: {
          OR: [
            { ownerUserId: user.id },
            { createdById: user.id },
            { designerId: user.id },
            { workspace: { is: { ownerId: user.id } } },
            { workspace: { is: { members: { some: { userId: user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } } } } } }
          ]
        }
      },
      include: {
        applicant: { select: { id: true, nickname: true, avatarUrl: true } },
        project: { select: { id: true, slug: true, title: true } }
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-ink/40">PROJECT PARTICIPATION</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">项目参与中心</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58">管理你发出的合作申请，以及你负责项目收到的申请。平台只提供连接和协作空间，是否合作由双方自主决定。</p>
        </div>
        <Link href="/projects" className="inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">发现合作项目</Link>
      </header>

      <section className="mt-9">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">待你审核 <span className="text-ink/35">{pendingReview.length}</span></h2>
        </div>
        <div className="mt-4 space-y-4">
          {pendingReview.length ? pendingReview.map((application) => (
            <article key={application.id} className="rounded-[10px] border border-black/8 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={"/projects/" + (application.project.slug ?? application.project.id)} className="text-lg font-semibold text-ink hover:underline">{application.project.title}</Link>
                  <p className="mt-1 text-sm text-ink/52">{application.applicant.nickname} · {PROJECT_APPLICATION_ROLE_LABELS[application.role]} · {formatDate(application.createdAt)}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">待审核</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/70">{application.message}</p>
              {application.experience ? <p className="mt-3 whitespace-pre-wrap rounded-[8px] bg-black/[0.025] p-3 text-sm leading-6 text-ink/58">相关经验：{application.experience}</p> : null}
              <form action={reviewProjectApplication} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input type="hidden" name="applicationId" value={application.id} />
                <input name="reviewNote" maxLength={300} placeholder="给申请人的说明（可选，不展示联系方式）" className="min-h-11 rounded-[8px] border border-black/10 px-3 text-sm outline-none focus:border-ink/40" />
                <button name="decision" value="REJECTED" className="min-h-11 rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">暂不接纳</button>
                <button name="decision" value="ACCEPTED" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white">接纳并加入工作区</button>
              </form>
            </article>
          )) : <div className="rounded-[10px] border border-dashed border-black/10 bg-white p-6 text-sm text-ink/50">目前没有待审核申请。</div>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">我发出的申请 <span className="text-ink/35">{submitted.length}</span></h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {submitted.length ? submitted.map((application) => (
            <article key={application.id} className="rounded-[10px] border border-black/8 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={"/projects/" + (application.project.slug ?? application.project.id)} className="font-semibold text-ink hover:underline">{application.project.title}</Link>
                <span className="shrink-0 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-ink/65">{PROJECT_APPLICATION_STATUS_LABELS[application.status]}</span>
              </div>
              <p className="mt-2 text-sm text-ink/50">{PROJECT_APPLICATION_ROLE_LABELS[application.role]} · {formatDate(application.updatedAt)}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/65">{application.message}</p>
              {application.reviewNote ? <p className="mt-3 rounded-[8px] bg-black/[0.025] p-3 text-sm text-ink/60">项目方说明：{application.reviewNote}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {application.status === "ACCEPTED" && application.project.workspace ? <Link href={"/me/workspaces/" + application.project.workspace.slug} className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white">进入项目工作区</Link> : null}
                {application.status === "PENDING" ? (
                  <form action={withdrawProjectApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <button className="min-h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">撤回申请</button>
                  </form>
                ) : null}
              </div>
            </article>
          )) : <div className="rounded-[10px] border border-dashed border-black/10 bg-white p-6 text-sm text-ink/50">你还没有发出项目参与申请。</div>}
        </div>
      </section>
    </main>
  );
}
