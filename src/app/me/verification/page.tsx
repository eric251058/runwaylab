import { redirect } from "next/navigation";
import { VerificationType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { submitVerificationRequest } from "@/lib/commercial-collaboration-actions";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/commercial-collaboration";
import { USER_PERSONA_LABELS } from "@/lib/persona";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString("zh-CN");
}

export default async function MeVerificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/verification");

  const requests = await prisma.verificationRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  const inputClass = "h-11 rounded-[6px] border border-black/10 px-3 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">My Verification</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">我的认证</h1>
        <p className="mt-4 text-sm leading-6 text-ink/58">当前身份：{USER_PERSONA_LABELS[user.persona]}。认证只用于平台可信展示，不改变后台权限。</p>
      </header>

      <form action={submitVerificationRequest} className="grid gap-3 rounded-[8px] border border-black/8 bg-white p-5 md:grid-cols-2">
        <select name="type" defaultValue={VerificationType.OTHER} className={inputClass}>
          {Object.values(VerificationType).map((type) => <option key={type} value={type}>{VERIFICATION_TYPE_LABELS[type]}</option>)}
        </select>
        <input name="realName" placeholder="姓名，可选" className={inputClass} />
        <input name="organizationName" placeholder="机构 / 公司 / 学校，可选" className={inputClass} />
        <input name="roleTitle" placeholder="职位 / 角色，可选" className={inputClass} />
        <input name="phone" placeholder="手机号，可选" className={inputClass} />
        <input name="email" placeholder="邮箱，可选" defaultValue={user.email ?? ""} className={inputClass} />
        <input name="wechat" placeholder="微信，可选" className={inputClass} />
        <input name="city" placeholder="城市，可选" className={inputClass} />
        <input name="proofUrl" placeholder="证明材料链接，可选" className={`${inputClass} md:col-span-2`} />
        <textarea name="description" placeholder="认证说明，例如课程、服务能力、合作经验" className="min-h-24 rounded-[6px] border border-black/10 px-3 py-3 text-sm md:col-span-2" />
        <button className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white md:col-span-2">提交认证申请</button>
      </form>

      <section className="mt-8 space-y-3">
        {requests.length ? requests.map((request) => (
          <article key={request.id} className="rounded-[8px] border border-black/8 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{VERIFICATION_STATUS_LABELS[request.status]}</span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{VERIFICATION_TYPE_LABELS[request.type]}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/58">{request.organizationName ?? request.realName ?? "认证资料待补充"} / {formatDate(request.createdAt)}</p>
            {request.reviewNote ? <p className="mt-2 text-sm leading-6 text-ink/58">审核备注：{request.reviewNote}</p> : null}
          </article>
        )) : <div className="rounded-[8px] border border-black/8 bg-white p-6 text-sm text-ink/55">暂无认证申请。</div>}
      </section>
    </div>
  );
}
