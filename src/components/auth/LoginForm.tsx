"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Mode = "login" | "register";
type RegisterContact = "phone" | "email";

type AuthUser = {
  id: string;
  email?: string | null;
  nickname: string;
  role: string;
};

export function LoginForm({ identityEnabled = false }: { identityEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [registerContact, setRegisterContact] = useState<RegisterContact>(identityEnabled ? "phone" : "email");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const usePhoneRegister = identityEnabled && registerContact === "phone";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = isRegister
      ? {
          email: usePhoneRegister ? null : email,
          phone: usePhoneRegister ? phone : null,
          password,
          nickname
        }
      : { identifier: identityEnabled ? identifier : email || identifier, email: email || identifier, password };

    const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => null)) as { message?: string; error?: string; user?: AuthUser } | null;
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.message ?? data?.error ?? "操作失败，请稍后再试。");
      return;
    }

    const fallback = data?.user?.role === "ADMIN" ? "/admin/works" : isRegister ? "/me/onboarding" : "/me";
    const next = safeRedirectPath(searchParams.get("next"), fallback);
    router.push(next || fallback);
    router.refresh();
  };

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
      <div className="mx-auto grid max-w-4xl items-center gap-6 md:grid-cols-[0.85fr_1.15fr]">
        <section className="hidden rounded-[8px] border border-black/8 bg-ink p-8 text-white md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">RUNWAYLAB ACCOUNT</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">一个账号，进入你的设计协作路径。</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">
            登录后可发布作品、表达想要、提交服务商方案或跟进项目进展。手机号登录在未接入短信前仅使用密码，不显示为已认证。
          </p>
        </section>

        <form onSubmit={submit} className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_22px_80px_rgba(20,20,20,0.09)] md:p-7">
          <div className="mb-7 flex rounded-full border border-black/10 bg-paper p-1 text-sm font-semibold">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-full px-4 py-2.5 transition ${mode === "login" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"}`}>
              登录
            </button>
            <button type="button" onClick={() => setMode("register")} className={`flex-1 rounded-full px-4 py-2.5 transition ${mode === "register" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"}`}>
              注册
            </button>
          </div>

          <div className="space-y-4">
            {isRegister ? (
              <>
                {identityEnabled ? (
                  <div className="grid grid-cols-2 gap-2 rounded-[8px] bg-paper p-1 text-xs font-semibold">
                    <button type="button" onClick={() => setRegisterContact("phone")} className={`rounded-[6px] px-3 py-2 ${registerContact === "phone" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}>
                      手机号注册
                    </button>
                    <button type="button" onClick={() => setRegisterContact("email")} className={`rounded-[6px] px-3 py-2 ${registerContact === "email" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}>
                      邮箱注册
                    </button>
                  </div>
                ) : null}
                <label className="block">
                  <span className="text-xs font-semibold text-ink/50">昵称</span>
                  <input value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="nickname" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white" required />
                </label>
                {usePhoneRegister ? (
                  <label className="block">
                    <span className="text-xs font-semibold text-ink/50">手机号</span>
                    <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="13800138000" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white" required />
                    <span className="mt-2 block text-xs leading-5 text-ink/45">手机号尚未验证，仅用于账号登录，不会公开展示。</span>
                  </label>
                ) : (
                  <label className="block">
                    <span className="text-xs font-semibold text-ink/50">邮箱</span>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white" required />
                  </label>
                )}
              </>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">{identityEnabled ? "手机号或邮箱" : "邮箱"}</span>
                <input value={identityEnabled ? identifier : email} onChange={(event) => (identityEnabled ? setIdentifier(event.target.value) : setEmail(event.target.value))} autoComplete="username" placeholder={identityEnabled ? "手机号或 you@example.com" : "you@example.com"} className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white" required />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">密码</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="至少 8 位" className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white" required />
            </label>
          </div>

          {message ? <p className="mt-4 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

          <button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "处理中..." : isRegister ? "注册并继续" : "登录"}
          </button>
        </form>
      </div>
    </main>
  );
}
