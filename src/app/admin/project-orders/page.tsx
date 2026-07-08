import { ProjectOrderStatus } from "@prisma/client";
import { saveProjectOrder } from "@/lib/commercial-collaboration-actions";
import { PROJECT_ORDER_STATUS_LABELS } from "@/lib/commercial-collaboration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProjectOrdersPage() {
  const [orders, projects, providers, users] = await Promise.all([
    prisma.projectOrder.findMany({ include: { project: true, provider: true, buyer: true, work: true }, orderBy: { createdAt: "desc" }, take: 160 }),
    prisma.collaborationProject.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.user.findMany({ orderBy: { nickname: "asc" }, take: 200 })
  ]);
  const input = "h-10 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">项目意向管理</h1>
        <p className="mt-4 text-sm text-ink/58">ProjectOrder 只是合作意向 / 项目记录占位，不是支付订单。</p>
      </header>
      <form action={saveProjectOrder} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="projectId" required className={input}><option value="">选择项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
        <input name="title" required placeholder="意向标题" className={input} />
        <select name="buyerId" className={input}><option value="">买手/用户，可选</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nickname}</option>)}</select>
        <select name="providerId" className={input}><option value="">服务商，可选</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
        <select name="status" defaultValue={ProjectOrderStatus.INTENT} className={input}>{Object.values(ProjectOrderStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_STATUS_LABELS[status]}</option>)}</select>
        <input name="workId" placeholder="作品 ID，可选" className={input} />
        <input name="quantityNote" placeholder="数量说明" className={input} />
        <input name="amountNote" placeholder="金额说明（仅备注）" className={input} />
        <input name="deliveryNote" placeholder="交付说明（仅备注）" className={input} />
        <textarea name="note" placeholder="备注" className="min-h-20 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">新增项目意向</button>
      </form>
      <section className="mt-8 space-y-3">
        {orders.length ? orders.map((order) => (
          <form key={order.id} action={saveProjectOrder} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={order.id} />
            <select name="projectId" defaultValue={order.projectId} className={input}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
            <input name="title" defaultValue={order.title} className={input} />
            <select name="status" defaultValue={order.status} className={input}>{Object.values(ProjectOrderStatus).map((status) => <option key={status} value={status}>{PROJECT_ORDER_STATUS_LABELS[status]}</option>)}</select>
            <select name="providerId" defaultValue={order.providerId ?? ""} className={input}><option value="">服务商</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select>
            <input name="workId" defaultValue={order.workId ?? ""} placeholder="作品 ID" className={input} />
            <select name="buyerId" defaultValue={order.buyerId ?? ""} className={input}><option value="">买手/用户</option>{users.map((user) => <option key={user.id} value={user.id}>{user.nickname}</option>)}</select>
            <input name="quantityNote" defaultValue={order.quantityNote ?? ""} placeholder="数量" className={input} />
            <input name="amountNote" defaultValue={order.amountNote ?? ""} placeholder="金额备注" className={input} />
            <input name="deliveryNote" defaultValue={order.deliveryNote ?? ""} placeholder="交付备注" className={input} />
            <textarea name="note" defaultValue={order.note ?? ""} className="min-h-16 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-3" />
            <button className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold">保存</button>
            <p className="text-xs text-ink/45 md:col-span-4">项目：{order.project.title} / 买手：{order.buyer?.nickname ?? "待关联"} / 服务商：{order.provider?.name ?? "待关联"}</p>
          </form>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无项目意向。</div>}
      </section>
    </div>
  );
}
