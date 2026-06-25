"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "register";

type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  role: string;
};

const TEST_ACCOUNTS = [
  "designer1@runwaylab.test / RunwayLab123!",
  "admin@runwaylab.test / RunwayLab123!"
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("designer1@runwaylab.test");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("RunwayLab123!");
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

    const next = searchParams.get("next");
    const fallback = data?.user?.role === "ADMIN" ? "/admin/works" : "/publish";
    router.push(next || fallback);
    router.refresh();
  };

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[8px] border border-black/8 bg-ink p-6 text-white md:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">RUNWAYLAB ACCOUNT</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.04] md:text-6xl">
            登录后发布你的服装设计作品。
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">
            V1.0 先支持邮箱注册和登录。设计师可以投稿、查看审核状态，管理员可以进入后台审核作品。
          </p>
          <div className="mt-8 grid gap-3 text-xs text-white/62">
            {TEST_ACCOUNTS.map((account) => (
              <div key={account} className="rounded-[6px] border border-white/12 bg-white/[0.06] px-4 py-3">
                {account}
              </div>
            ))}
          </div>
        </section>

        <form
          onSubmit={submit}
          className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_22px_80px_rgba(20,20,20,0.09)] md:p-7"
        >
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
                placeholder="designer1@runwaylab.test"
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
