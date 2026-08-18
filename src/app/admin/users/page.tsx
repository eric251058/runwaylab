import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { UserStatusActionForm } from "@/components/admin/UserStatusActionForm";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserStatus, verifyPilotBuyerContact } from "@/lib/admin-user-actions";
import { USER_PERSONA_LABELS } from "@/lib/persona";
import { maskPhone } from "@/lib/phone";
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
  const params = await searchParams;
  const query = firstParam(params?.query)?.trim().slice(0, 100) ?? "";
  const where = query ? {
    OR: [
      { id: query },
      { email: { equals: query, mode: Prisma.QueryMode.insensitive } },
      { phone: query },
      { nickname: { contains: query, mode: Prisma.QueryMode.insensitive } }
    ]
  } satisfies Prisma.UserWhereInput : undefined;
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({
    where,
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
    take: query ? 50 : 200
    }),
    getCurrentUser()
  ]);
  const error = firstParam(params?.error);
  const updated = firstParam(params?.updated);
  const verified = firstParam(params?.verified);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">用户管理</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">查看用户身份与账号状态。停用账号后，该用户当前登录状态会立即失效。</p>
      </header>

      {updated ? <p className="mb-4 rounded-[8px] border border-black/8 bg-white px-4 py-3 text-sm text-ink/60">用户状态已更新。</p> : null}
      {verified ? (
        <p className="mb-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {verified === "already" ? "该联系方式此前已经完成核验。" : "联系方式核验已记录，审计日志和用户通知已同步写入。"}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "self"
            ? "不能停用当前登录的管理员账号。"
            : error === "last-admin"
              ? "不能停用最后一个可用管理员。"
              : error === "verification-evidence"
                ? "人工核验必须填写证据编号、至少 10 字摘要并确认已核对联系方式归属。"
                : error === "verification-user"
                  ? "只有正常状态的非管理员账号可以登记首期买家联系方式核验。"
                  : error === "verification-contact"
                    ? "该账号没有可核验的对应联系方式。"
                    : error === "verification-conflict"
                      ? "联系方式或账号状态已变化，请刷新后重新核验。"
              : "操作未完成，请稍后再试。"}
        </p>
      ) : null}

      <form className="mb-5 flex flex-col gap-2 rounded-[8px] border border-black/8 bg-white p-4 sm:flex-row" method="get">
        <input
          name="query"
          defaultValue={query}
          placeholder="按完整用户 ID、邮箱、手机号或昵称搜索"
          className="h-10 flex-1 rounded-[6px] border border-black/10 px-3 text-sm outline-none focus:border-black/30"
        />
        <button className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white">搜索用户</button>
        {query ? <a href="/admin/users" className="flex h-10 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold">清除</a> : null}
      </form>

      <section className="space-y-3">
        {users.length ? users.map((user) => (
          <article key={user.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{user.nickname}</h2>
                <p className="mt-1 break-all text-sm text-ink/52">{user.email}</p>
                <p className="mt-1 text-sm text-ink/52">手机号：{maskPhone(user.phone) ?? "未填写"}</p>
                <p className="mt-2 text-xs text-ink/42">
                  角色：{roleLabels[user.role]} / 状态：{statusLabels[user.status]}
                </p>
                <p className="mt-1 text-xs text-ink/42">
                  邮箱核验：{user.emailVerifiedAt ? "已核验" : "未核验"} / 手机核验：{user.phoneVerifiedAt ? "已核验" : "未核验"}
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
            {user.status === UserStatus.ACTIVE && user.role !== UserRole.ADMIN && (
              (user.email && !user.emailVerifiedAt) || (user.phone && !user.phoneVerifiedAt)
            ) ? (
              <details className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-amber-900">登记首期预售联系方式人工核验</summary>
                <p className="mt-2 text-xs leading-5 text-amber-900/70">
                  仅在已通过站外回拨、邮件回复或等效方式确认联系方式归属后登记。证据只填外部记录编号与最小摘要，不填写完整聊天、证件号或其他敏感正文。
                </p>
                <form action={verifyPilotBuyerContact} className="mt-3 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <select name="contactType" required className="h-10 rounded-[6px] border border-black/10 bg-white px-3 text-sm">
                    {user.email && !user.emailVerifiedAt ? <option value="email">核验邮箱</option> : null}
                    {user.phone && !user.phoneVerifiedAt ? <option value="phone">核验手机号</option> : null}
                  </select>
                  <input name="evidenceRef" required minLength={4} maxLength={200} placeholder="证据/工单编号（至少 4 字）" className="h-10 rounded-[6px] border border-black/10 bg-white px-3 text-sm" />
                  <textarea name="evidenceSummary" required minLength={10} maxLength={500} placeholder="最小核验摘要（至少 10 字，不含完整联系方式）" className="min-h-20 rounded-[6px] border border-black/10 bg-white p-3 text-sm md:col-span-2" />
                  <label className="flex items-start gap-2 text-xs leading-5 text-amber-950 md:col-span-2">
                    <input type="checkbox" name="confirmContactOwnership" required className="mt-1" />
                    我确认已实际核对该联系方式归属，本操作只建立首期下单准入，不代表平台确认付款或替用户作出订单决定。
                  </label>
                  <button className="h-10 rounded-full bg-amber-900 px-5 text-sm font-semibold text-white md:col-span-2">保存人工核验记录</button>
                </form>
              </details>
            ) : null}
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无用户。</div>}
      </section>
    </div>
  );
}
