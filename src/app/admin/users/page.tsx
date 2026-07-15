import { UserRole, UserStatus } from "@prisma/client";
import { UserStatusActionForm } from "@/components/admin/UserStatusActionForm";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserStatus } from "@/lib/admin-user-actions";
import { USER_PERSONA_LABELS } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels = {
  ACTIVE: "正常",
  BANNED: "已停用"
} satisfies Record<UserStatus, string>;

const roleLabels = {
  USER: "普通用户",
  STUDENT_DESIGNER: "学生设计师",
  NEW_DESIGNER: "新锐设计师",
  ADMIN: "管理员"
} satisfies Record<UserRole, string>;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [users, currentUser, params] = await Promise.all([
    prisma.user.findMany({
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
    }),
    getCurrentUser(),
    searchParams
  ]);
  const error = firstParam(params?.error);
  const updated = firstParam(params?.updated);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">用户管理</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">查看用户身份与账号状态。停用账号后，该用户当前登录状态会立即失效。</p>
      </header>

      {updated ? <p className="mb-4 rounded-[8px] border border-black/8 bg-white px-4 py-3 text-sm text-ink/60">用户状态已更新。</p> : null}
      {error ? (
        <p className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "self"
            ? "不能停用当前登录的管理员账号。"
            : error === "last-admin"
              ? "不能停用最后一个可用管理员。"
              : "操作未完成，请稍后再试。"}
        </p>
      ) : null}

      <section className="space-y-3">
        {users.length ? users.map((user) => (
          <article key={user.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{user.nickname}</h2>
                <p className="mt-1 text-sm text-ink/52">{user.email}</p>
                <p className="mt-2 text-xs text-ink/42">
                  角色：{roleLabels[user.role]} / 状态：{statusLabels[user.status]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === UserStatus.ACTIVE ? "bg-paper text-ink/55" : "bg-red-50 text-red-700"}`}>
                  {statusLabels[user.status]}
                </span>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{USER_PERSONA_LABELS[user.persona]}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.personaCompleted ? "bg-ink text-white" : "bg-paper text-ink/55"}`}>
                  {user.personaCompleted ? "已完成身份选择" : "未选择身份"}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink/42">作品 {user._count.works} / 收藏 {user._count.favorites} / 点赞 {user._count.likes}</p>
              {user.status === UserStatus.ACTIVE ? (
                <UserStatusActionForm
                  action={updateUserStatus}
                  userId={user.id}
                  status={UserStatus.BANNED}
                  label="停用账号"
                  confirmMessage="确定停用这个账号吗？停用后该用户需要联系平台恢复。"
                  disabled={user.id === currentUser?.id}
                />
              ) : (
                <UserStatusActionForm
                  action={updateUserStatus}
                  userId={user.id}
                  status={UserStatus.ACTIVE}
                  label="恢复账号"
                  confirmMessage="确定恢复这个账号吗？"
                />
              )}
            </div>
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无用户。</div>}
      </section>
    </div>
  );
}
