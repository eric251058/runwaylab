"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Mode = "login" | "register";

type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  role: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = isRegister ? { email, password, nickname } : { email, password };
    const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => null)) as { message?: string; user?: AuthUser } | null;
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.message ?? "操作失败，请稍后再试。");
      return;
    }

    const fallback = data?.user?.role === "ADMIN" ? "/admin/works" : "/publish";
    const next = safeRedirectPath(searchParams.get("next"), fallback);
    router.push(next || fallback);
    router.refresh();
  };

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
      <div className="mx-auto grid max-w-4xl items-center gap-6 md:grid-cols-[0.85fr_1.15fr]">
        <section className="hidden rounded-[8px] border border-black/8 bg-ink p-6 text-white md:block md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">RUNWAYLAB ACCOUNT</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">登录后发布作品。</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">用自己的邮箱登录，继续发布、收藏和跟进作品进展。</p>
        </section>

        <form
          onSubmit={submit}
          className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_22px_80px_rgba(20,20,20,0.09)] md:p-7"
        >
          <div className="mb-5 md:hidden">
            <h1 className="text-3xl font-semibold text-ink">登录 RunwayLab</h1>
            <p className="mt-2 text-sm leading-6 text-ink/52">发布作品，查看进展。</p>
          </div>
          <div className="mb-7 flex rounded-full border border-black/10 bg-paper p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`flex-1 rounded-full px-4 py-2.5 transition ${
                mode === "login" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`flex-1 rounded-full px-4 py-2.5 transition ${
                mode === "register" ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
              }`}
            >
              注册
            </button>
          </div>

          <div className="space-y-4">
            {isRegister ? (
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">昵称</span>
                <input
                  name="nickname"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="例如：织物观察员"
                  autoComplete="nickname"
                  className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white"
                  required
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">邮箱</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink/50">密码</span>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="mt-2 h-12 w-full rounded-[6px] border border-black/10 bg-paper px-4 text-sm outline-none transition focus:border-ink focus:bg-white"
                required
              />
            </label>
          </div>

          {message ? (
            <p className="mt-4 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "处理中..." : isRegister ? "注册并登录" : "登录"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setMessage("");
            }}
            className="mt-4 w-full text-center text-xs font-semibold text-ink/50 hover:text-ink"
          >
            {isRegister ? "已有账号？切换到登录" : "还没有账号？创建设计师账号"}
          </button>
        </form>
      </div>
    </main>
  );
}
