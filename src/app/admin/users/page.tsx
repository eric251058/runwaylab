import { USER_PERSONA_LABELS } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          works: true,
          favorites: true,
          likes: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">用户管理</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">本页仅展示用户身份选择情况；后台权限仍由 role 控制。</p>
      </header>

      <section className="space-y-3">
        {users.length ? users.map((user) => (
          <article key={user.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{user.nickname}</h2>
                <p className="mt-1 text-sm text-ink/52">{user.email}</p>
                <p className="mt-2 text-xs text-ink/42">
                  role: {user.role} / status: {user.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{USER_PERSONA_LABELS[user.persona]}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.personaCompleted ? "bg-ink text-white" : "bg-paper text-ink/55"}`}>
                  {user.personaCompleted ? "已完成身份选择" : "未选择身份"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink/42">作品 {user._count.works} / 收藏 {user._count.favorites} / 点赞 {user._count.likes}</p>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无用户。</div>}
      </section>
    </div>
  );
}
