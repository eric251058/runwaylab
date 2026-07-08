import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeProjectOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/project-orders");

  const orders = await prisma.projectOrder.findMany({
    where: {
      OR: [
        { buyerId: user.id },
        { work: { userId: user.id } },
        { project: { designerId: user.id } },
        { project: { work: { userId: user.id } } }
      ]
    },
    include: { project: true, provider: true, work: true },
    orderBy: { createdAt: "desc" },
    take: 80
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Project Intents</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">项目意向</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">这里只是合作意向 / 项目记录占位，不是支付订单或商城订单。</p>
      </header>
      <section className="space-y-3">
        {orders.length ? orders.map((order) => (
          <article key={order.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{PROJECT_ORDER_STATUS_LABELS[order.status]}</span>
            <h2 className="mt-3 font-semibold text-ink">{order.title}</h2>
            <p className="mt-1 text-sm text-ink/52">{order.project.title} / {order.provider?.name ?? "服务商待关联"}</p>
            <p className="mt-2 text-sm leading-6 text-ink/58">{[order.quantityNote, order.amountNote, order.deliveryNote, order.note].filter(Boolean).join(" / ") || "细节待线下确认"}</p>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无项目意向。</div>}
      </section>
    </div>
  );
}
