import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { InquiryReplyForm } from "@/components/providers/InquiryReplyForm";
import { updateProviderInquiry } from "@/lib/provider-center-actions";
import { getProviderCenterContext } from "@/lib/provider-center-context";
import { prisma } from "@/lib/prisma";
import { PROVIDER_INQUIRY_STATUS_LABELS, PROVIDER_INQUIRY_TYPE_LABELS } from "@/lib/supply-network";

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

function stat(label: string, value: number) {
  return (
    <div className="rounded-[8px] bg-white p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/45">{label}</p>
    </div>
  );
}

function contactAuthText(preference?: string | null, contact?: string | null) {
  if (preference === "ALLOW_PHONE") return `已授权手机号：${contact || "未填写"}`;
  if (preference === "ALLOW_EMAIL") return `已授权邮箱：${contact || "未填写"}`;
  return "仅站内沟通";
}

function inquirySummary(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim() || "未填写需求说明";
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

const closedStatuses = new Set<RequestStatus>([RequestStatus.CLOSED, RequestStatus.COMPLETED]);

export default async function ProviderCenterInquiriesPage() {
  const { provider } = await getProviderCenterContext("/provider-center/inquiries");
  if (!provider) redirect("/providers/apply");

  await prisma.cooperationRequest.updateMany({
    where: { providerId: provider.id, viewedAt: null },
    data: { viewedAt: new Date() }
  });

  const inquiries = await prisma.cooperationRequest.findMany({
    where: { providerId: provider.id },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          works: {
            select: { id: true, title: true },
            orderBy: { createdAt: "desc" },
            take: 3
          }
        }
      },
      work: { select: { id: true, title: true } },
      fabric: { select: { id: true, name: true, slug: true } },
      showcaseItem: { select: { id: true, title: true } },
      replies: {
        include: { sender: { select: { id: true, nickname: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  const newCount = inquiries.filter((item) => item.status === RequestStatus.PENDING).length;
  const pendingCount = inquiries.filter((item) => item.status === RequestStatus.CONTACTED || item.status === RequestStatus.EVALUATED).length;
  const repliedCount = inquiries.filter((item) => item.status === RequestStatus.QUOTED).length;
  const closedCount = inquiries.filter((item) => closedStatuses.has(item.status)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Inquiries</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink md:text-5xl">询盘</h1>
          <p className="mt-3 text-sm text-ink/52">查看设计师发来的需求，并通过站内回复继续沟通。</p>
        </div>
        <Link href="/provider-center" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
          返回中心
        </Link>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("新询盘", newCount)}
        {stat("待回复", pendingCount + newCount)}
        {stat("已回复", repliedCount)}
        {stat("已结束", closedCount)}
      </section>

      {inquiries.length ? (
        <section className="space-y-4">
          {inquiries.map((inquiry) => {
            const disabled = closedStatuses.has(inquiry.status);
            return (
              <article key={inquiry.id} className="rounded-[8px] border border-black/8 bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROVIDER_INQUIRY_STATUS_LABELS[inquiry.status]}</span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROVIDER_INQUIRY_TYPE_LABELS[inquiry.requestType]}</span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{inquiry.viewedAt ? "已查看" : "未查看"}</span>
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{contactAuthText(inquiry.contactPreference, inquiry.contact)}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-ink">{inquiry.user.nickname} 的询盘</h2>
                    <p className="mt-1 text-sm text-ink/52">提交时间：{formatDate(inquiry.createdAt)}</p>
                    {inquiry.work ? (
                      <p className="mt-1 text-sm text-ink/52">
                        关联作品：
                        <Link href={`/works/${inquiry.work.id}`} className="underline">
                          {inquiry.work.title}
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-3 rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/60">{inquirySummary(inquiry.message)}</p>

                    <details className="mt-3 rounded-[8px] border border-black/8 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-ink">查看详情与回复</summary>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-ink/35">完整需求</p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/65">{inquiry.message || "未填写需求说明"}</p>
                        </div>
                        {inquiry.fabric ? (
                          <p className="text-sm text-ink/55">
                            关联面料：
                            <Link href={`/fabrics/${inquiry.fabric.slug ?? inquiry.fabric.id}`} className="underline">
                              {inquiry.fabric.name}
                            </Link>
                          </p>
                        ) : null}
                        {inquiry.showcaseItem ? <p className="text-sm text-ink/55">关联案例：{inquiry.showcaseItem.title}</p> : null}
                        {inquiry.user.works.length ? (
                          <div>
                            <p className="text-xs font-semibold text-ink/35">设计师其他作品</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {inquiry.user.works.map((work) => (
                                <Link key={work.id} href={`/works/${work.id}`} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">
                                  {work.title}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
                            <p className="rounded-[6px] bg-paper p-3 text-sm text-ink/45">暂无回复。</p>
                          )}
                        </div>
                        <InquiryReplyForm inquiryId={inquiry.id} placeholder="回复设计师，或请求补充信息。" buttonLabel="回复询盘" disabled={disabled} />
                      </div>
                    </details>
                  </div>
                  <form action={updateProviderInquiry} className="grid gap-2 lg:w-72">
                    <input type="hidden" name="id" value={inquiry.id} />
                    <input type="hidden" name="providerResponse" value={inquiry.providerResponse ?? ""} />
                    <button name="status" value={RequestStatus.CONTACTED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">
                      标记已查看
                    </button>
                    <button name="status" value={RequestStatus.EVALUATED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">
                      标记感兴趣
                    </button>
                    <button name="status" value={RequestStatus.CLOSED} className="h-10 rounded-full border border-black/10 px-3 text-xs font-semibold">
                      暂不合适
                    </button>
                    <button name="status" value={RequestStatus.COMPLETED} className="h-10 rounded-full bg-ink px-3 text-xs font-semibold text-white">
                      已结束
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm leading-6 text-ink/58">暂时还没有新的服务询盘。完善主页、产品和案例后，更容易被设计师判断和联系。</div>
      )}
    </div>
  );
}
