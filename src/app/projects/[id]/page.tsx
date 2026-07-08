import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewStatus } from "@prisma/client";
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, publicProjectWhere } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await prisma.collaborationProject.findFirst({
    where: {
      AND: [publicProjectWhere(), { OR: [{ id }, { slug: id }] }]
    },
    include: {
      work: { include: { user: true, images: { orderBy: { sortOrder: "asc" } } } },
      designer: true,
      school: true,
      teacher: true,
      provider: true,
      fabric: true,
      presaleCampaign: true,
      orders: { orderBy: { createdAt: "desc" }, take: 8 },
      reviews: { where: { status: ReviewStatus.PUBLISHED }, include: { reviewer: true }, orderBy: { createdAt: "desc" }, take: 8 }
    }
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="rounded-[8px] bg-white p-6 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_STATUS_LABELS[project.status]}</span>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{PROJECT_PRIORITY_LABELS[project.priority]}</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold text-ink md:text-6xl">{project.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/60">{project.description ?? "项目说明待补充"}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">项目关联</h2>
          <div className="mt-4 grid gap-3 text-sm text-ink/58 md:grid-cols-2">
            <Link href={`/works/${project.workId}`} className="rounded-[6px] bg-paper p-3 font-semibold text-ink">作品：{project.work.title}</Link>
            <Link href={`/designers/${project.work.userId}`} className="rounded-[6px] bg-paper p-3">设计师：{project.designer?.nickname ?? project.work.user.nickname}</Link>
            <div className="rounded-[6px] bg-paper p-3">学校：{project.school?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">老师：{project.teacher?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">服务商：{project.provider?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">面料：{project.fabric?.name ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">预售活动：{project.presaleCampaign?.title ?? "待关联"}</div>
            <div className="rounded-[6px] bg-paper p-3">目标：{project.targetQuantity ?? "待定"} / {project.estimatedBudget ?? "预算待定"}</div>
          </div>
        </section>

        <section className="rounded-[8px] border border-black/8 bg-white p-5">
          <h2 className="text-2xl font-semibold text-ink">项目意向记录</h2>
          <div className="mt-4 space-y-3">
            {project.orders.length ? project.orders.map((order) => (
              <article key={order.id} className="rounded-[6px] bg-paper p-3 text-sm text-ink/58">
                <p className="font-semibold text-ink">{order.title}</p>
                <p className="mt-1">{[order.quantityNote, order.amountNote, order.deliveryNote].filter(Boolean).join(" / ") || "细节待线下确认"}</p>
              </article>
            )) : <p className="text-sm text-ink/55">暂无项目意向记录。</p>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[8px] border border-black/8 bg-white p-5">
        <h2 className="text-2xl font-semibold text-ink">公开评价</h2>
        <div className="mt-4 space-y-3">
          {project.reviews.length ? project.reviews.map((review) => (
            <article key={review.id} className="rounded-[6px] bg-paper p-3">
              <p className="text-sm font-semibold text-ink">{review.reviewer.nickname} / {review.rating} 分</p>
              <p className="mt-1 text-sm leading-6 text-ink/58">{review.content ?? "暂无文字评价"}</p>
            </article>
          )) : <p className="text-sm text-ink/55">暂无公开评价。</p>}
        </div>
      </section>
    </div>
  );
}
