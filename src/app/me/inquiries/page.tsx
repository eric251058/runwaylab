import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { ContactAuthorizationControl } from "@/components/providers/ContactAuthorizationControl";
import { InquiryReplyForm } from "@/components/providers/InquiryReplyForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PROVIDER_INQUIRY_STATUS_LABELS, PROVIDER_INQUIRY_TYPE_LABELS, providerPublicUrl } from "@/lib/supply-network";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const designerStatusLabels: Record<RequestStatus, string> = {
  PENDING: "已发送",
  CONTACTED: "服务商已查看",
  EVALUATED: "沟通中",
  QUOTED: "服务商已回复",
  CLOSED: "已结束",
  COMPLETED: "已结束"
};

const closedStatuses = new Set<RequestStatus>([RequestStatus.CLOSED, RequestStatus.COMPLETED]);

export default async function MyInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/inquiries");

  const inquiries = await prisma.cooperationRequest.findMany({
    where: { userId: user.id, providerId: { not: null } },
    include: {
      provider: { select: { id: true, slug: true, name: true, type: true } },
      work: { select: { id: true, title: true } },
      fabric: { select: { id: true, name: true, slug: true } },
      showcaseItem: { select: { id: true, title: true } },
      replies: {
        include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Inquiries</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">我的询盘</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">查看你发给服务商的需求、回复和联系方式授权。</p>
        </div>
        <Link href="/providers" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          查看服务商
        </Link>
      </header>

      {inquiries.length ? (
        <section className="grid gap-4">
          {inquiries.map((inquiry) => {
            const disabled = closedStatuses.has(inquiry.status);
            return (
              <article key={inquiry.id} className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{designerStatusLabels[inquiry.status]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_INQUIRY_TYPE_LABELS[inquiry.requestType]}</span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_INQUIRY_STATUS_LABELS[inquiry.status]}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">
                  {inquiry.provider ? (
                    <Link href={providerPublicUrl(inquiry.provider)} className="hover:text-ink/70">
                      {inquiry.provider.name}
                    </Link>
                  ) : (
                    "服务商"
                  )}
                </h2>
                <p className="mt-1 text-sm text-ink/52">发送时间：{formatDate(inquiry.createdAt)}</p>
                {inquiry.work ? (
                  <p className="mt-1 text-sm text-ink/52">
                    关联作品：
                    <Link href={`/works/${inquiry.work.id}`} className="underline">
                      {inquiry.work.title}
                    </Link>
                  </p>
                ) : null}
                <p className="mt-3 whitespace-pre-line rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/60">{inquiry.message || "未填写需求说明"}</p>
                <details className="mt-3 rounded-[8px] border border-black/8 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">查看回复与继续补充</summary>
                  <div className="mt-4 space-y-4">
                    <ContactAuthorizationControl inquiryId={inquiry.id} initialValue={inquiry.contactPreference} />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-ink/35">站内回复</p>
                      {inquiry.replies.length ? (
                        inquiry.replies.map((reply) => (
                          <div key={reply.id} className="rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/65">
                            <p className="text-xs font-semibold text-ink/40">
                              {reply.sender.nickname} / {formatDate(reply.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-line">{reply.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-[6px] bg-paper p-3 text-sm text-ink/45">服务商还没有回复。</p>
                      )}
                    </div>
                    <InquiryReplyForm inquiryId={inquiry.id} placeholder="补充作品阶段、数量、时间或其他说明。" buttonLabel="补充信息" disabled={disabled} />
                  </div>
                </details>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">
          你还没有发送服务商询盘。浏览服务商主页后，可以先通过站内沟通，不必公开手机号或邮箱。
        </section>
      )}
    </main>
  );
}
