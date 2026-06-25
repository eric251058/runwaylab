import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/works");
  }

  if (!isAdmin(user)) {
    return (
      <main className="min-h-[70dvh] bg-paper px-4 py-12 text-ink md:px-8">
        <div className="mx-auto max-w-xl rounded-[8px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(16,16,16,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">403</p>
          <h1 className="mt-3 text-3xl font-semibold">你没有后台访问权限</h1>
          <p className="mt-4 text-sm leading-6 text-ink/58">
            当前账号不是管理员账号。请使用 admin@runwaylab.test 登录后再进入作品审核后台。
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/me" className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold">
              返回我的页面
            </Link>
            <Link href="/login?next=/admin/works" className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">
              切换管理员账号
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
