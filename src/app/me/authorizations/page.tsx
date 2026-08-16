import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectDesignAuthorizationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { respondProjectDesignAuthorization, revokeProjectDesignAuthorization } from "@/lib/projects/actions";
import { PROJECT_AUTHORIZATION_LABELS } from "@/lib/projects/rules";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function MyDesignAuthorizationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/authorizations");

  const authorizations = await prisma.projectDesignAuthorization.findMany({
    where: { designerUserId: user.id },
    include: {
      project: { select: { id: true, slug: true, title: true, designerAuthorizationStatus: true } },
      work: { select: { id: true, title: true } },
      owner: { select: { nickname: true } }
    },
    orderBy: { requestedAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-ink/40">DESIGN RIGHTS</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">设计授权</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">项目方可以发起合作请求，但不能代替你同意。请先核对作品、授权范围、分成说明与条款版本，再独立决定接受或拒绝；已经接受的授权也可以由你撤销。</p>
        </div>
        <Link href="/me/projects" className="inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-ink">返回我的项目</Link>
      </div>

      <section className="mt-8 space-y-4">
        {authorizations.length ? authorizations.map((authorization) => {
          const projectHref = "/projects/" + (authorization.project.slug ?? authorization.project.id);
          return (
            <article key={authorization.id} className="rounded-[10px] border border-black/8 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink/40">条款 {authorization.termsVersion}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{authorization.project.title}</h2>
                  <p className="mt-1 text-sm text-ink/55">作品：{authorization.work.title} · 发起方：{authorization.owner.nickname ?? "项目主理人"}</p>
                </div>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/65">{PROJECT_AUTHORIZATION_LABELS[authorization.status]}</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[8px] bg-paper p-4">
                  <p className="text-xs font-semibold text-ink/40">授权范围</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{authorization.scope}</p>
                </div>
                <div className="rounded-[8px] bg-paper p-4">
                  <p className="text-xs font-semibold text-ink/40">分成说明</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">{authorization.royaltyDescription ?? "尚未填写；接受前建议先与项目方确认。"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/45">
                <span>请求：{formatDate(authorization.requestedAt)}</span>
                <span>接受：{formatDate(authorization.acceptedAt)}</span>
                <span>撤销：{formatDate(authorization.revokedAt)}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={projectHref} className="inline-flex min-h-10 items-center rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">查看公开项目</Link>
                {authorization.status === ProjectDesignAuthorizationStatus.PENDING ? (
                  <>
                    <form action={respondProjectDesignAuthorization}>
                      <input type="hidden" name="projectId" value={authorization.projectId} />
                      <input type="hidden" name="status" value={ProjectDesignAuthorizationStatus.ACCEPTED} />
                      <button className="min-h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white">接受授权</button>
                    </form>
                    <form action={respondProjectDesignAuthorization}>
                      <input type="hidden" name="projectId" value={authorization.projectId} />
                      <input type="hidden" name="status" value={ProjectDesignAuthorizationStatus.REJECTED} />
                      <button className="min-h-10 rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700">拒绝授权</button>
                    </form>
                  </>
                ) : null}
                {authorization.status === ProjectDesignAuthorizationStatus.ACCEPTED ? (
                  <form action={revokeProjectDesignAuthorization}>
                    <input type="hidden" name="projectId" value={authorization.projectId} />
                    <button className="min-h-10 rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-800">撤销授权</button>
                  </form>
                ) : null}
              </div>
              <p className="mt-4 text-xs leading-5 text-ink/40">授权决定只改变合作许可状态，不会自动创建订单、扣款、生产任务或收入。</p>
            </article>
          );
        }) : (
          <div className="rounded-[10px] border border-dashed border-black/12 bg-white p-8 text-sm leading-6 text-ink/55">目前没有需要你处理的设计授权请求。项目方发起后，会显示在这里。</div>
        )}
      </section>
    </main>
  );
}
