import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SupportForm } from "@/components/SupportForm";
import { SUPPORT_LABELS } from "@/lib/support";
export const dynamic = "force-dynamic";
export const metadata = { title: "帮助与隐私申请", robots: { index: false, follow: false } };
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || "1", 10) || 1));
  const items = user ? await prisma.supportRequest.findMany({ where: { requesterId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: (page - 1) * 20 }) : [];
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <h1 className="text-3xl font-semibold">帮助与隐私申请</h1>
    <p className="mt-4 leading-7">反馈使用问题，或申请修改、删除你的资料。提交后不会自动删除账号或作品，管理员会核实后回复。申请内容仅你和管理员可查看。</p>
    {user ? <SupportForm /> : <Link className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-white" href="/login?next=/support">登录后提交并查看申请</Link>}
    {user ? <section className="mt-10"><h2 className="text-xl font-semibold">我的申请</h2>
      {!items.length ? <p className="mt-4">暂无申请记录。</p> : items.slice(0, 20).map(item => <article key={item.id} className="mt-4 rounded border bg-white p-4">
        <h3 className="font-semibold">{SUPPORT_LABELS[item.category]} · {item.status === "PENDING" ? "待处理" : "已回复"}</h3>
        <p className="mt-2 break-all text-xs">编号：{item.id}</p><p className="mt-3 whitespace-pre-wrap break-words">{item.message}</p>
        {item.reply ? <div className="mt-4 rounded bg-paper p-3"><p className="font-semibold">处理结果</p><p className="mt-2 whitespace-pre-wrap break-words">{item.reply}</p></div> : <p className="mt-3 text-sm">尚未回复，请稍后在此查看。</p>}
      </article>)}
      <nav className="mt-5 flex gap-5" aria-label="申请分页">{page > 1 ? <Link href={`/support?page=${page - 1}`}>上一页</Link> : null}{items.length > 20 ? <Link href={`/support?page=${page + 1}`}>下一页</Link> : null}</nav>
    </section> : null}
  </main>;
}
