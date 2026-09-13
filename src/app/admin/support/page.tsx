import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SupportForm } from "@/components/SupportForm";
import { SUPPORT_LABELS } from "@/lib/support";
export const dynamic = "force-dynamic";
export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) notFound();
  const params = await searchParams;
  const status = params.status === "RESOLVED" ? "RESOLVED" : "PENDING";
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || "1", 10) || 1));
  const items = await prisma.supportRequest.findMany({ where: { status }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 21, skip: (page - 1) * 20, include: { requester: { select: { nickname: true } } } });
  return <main className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-semibold">帮助与隐私申请</h1>
    <p className="mt-3">回复应说明实际处理结果；此操作只保存回复，不会自动修改或删除用户数据。</p>
    <nav className="mt-5 flex gap-5"><Link href="/admin/support">待处理</Link><Link href="/admin/support?status=RESOLVED">已回复</Link></nav>
    {!items.length ? <p className="mt-6">当前没有申请。</p> : items.slice(0, 20).map(item => <article key={item.id} className="mt-5 rounded border bg-white p-5">
      <h2 className="font-semibold">{SUPPORT_LABELS[item.category]} · {item.requester.nickname}</h2><p className="mt-2 break-all text-xs">{item.id}</p>
      <p className="mt-4 whitespace-pre-wrap break-words">{item.message}</p>
      {item.status === "PENDING" ? <SupportForm id={item.id} version={item.version} /> : <p className="mt-4 whitespace-pre-wrap break-words">处理结果：{item.reply}</p>}
    </article>)}
    <nav className="mt-5 flex gap-5">{page > 1 ? <Link href={`/admin/support?status=${status}&page=${page - 1}`}>上一页</Link> : null}{items.length > 20 ? <Link href={`/admin/support?status=${status}&page=${page + 1}`}>下一页</Link> : null}</nav>
  </main>;
}
