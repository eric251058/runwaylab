import { VerificationStatus } from "@prisma/client";
import { reviewVerificationRequest } from "@/lib/commercial-collaboration-actions";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/commercial-collaboration";
import { USER_PERSONA_LABELS } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const requests = await prisma.verificationRequest.findMany({
    include: { user: true, reviewedBy: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">认证审核</h1>
      </header>
      <section className="space-y-3">
        {requests.length ? requests.map((request) => (
          <article key={request.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{VERIFICATION_STATUS_LABELS[request.status]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{VERIFICATION_TYPE_LABELS[request.type]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{USER_PERSONA_LABELS[request.persona]}</span>
                </div>
                <h2 className="mt-3 font-semibold text-ink">{request.organizationName ?? request.realName ?? request.user.nickname}</h2>
                <p className="mt-1 text-sm text-ink/52">{request.user.email} / {request.city ?? "城市待补充"}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58">{request.description ?? "暂无说明"}</p>
                <p className="mt-2 text-xs text-ink/42">
                  联系：{[request.phone, request.email, request.wechat].filter(Boolean).join(" / ") || "未填写"} {request.proofUrl ? ` / 证明：${request.proofUrl}` : ""}
                </p>
              </div>
              <form action={reviewVerificationRequest} className="grid gap-2">
                <input type="hidden" name="id" value={request.id} />
                <select name="status" defaultValue={request.status} className="h-10 rounded-[6px] border border-black/10 px-3 text-sm">
                  {Object.values(VerificationStatus).map((status) => <option key={status} value={status}>{VERIFICATION_STATUS_LABELS[status]}</option>)}
                </select>
                <textarea name="reviewNote" defaultValue={request.reviewNote ?? ""} placeholder="审核备注" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm" />
                <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存审核</button>
              </form>
            </div>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无认证申请。</div>}
      </section>
    </div>
  );
}
