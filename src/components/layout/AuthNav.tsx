"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  nickname: string;
  email?: string | null;
  role: string;
  status: string;
  persona?: string | null;
  personaCompleted?: boolean;
  hasProvider?: boolean;
};

const coveredRoutes = [
  "/",
  "/works",
  "/publish",
  "/me",
  "/provider-center",
  "/incubation",
  "/presale",
  "/projects",
  "/cases",
  "/verify",
  "/legal",
  "/challenges",
  "/designers",
  "/schools",
  "/teachers",
  "/exhibitions",
  "/providers",
  "/fabrics",
  "/batches"
];

function isCoveredRoute(pathname: string) {
  return coveredRoutes.some((route) => (route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`)));
}

function isProviderUser(user: AuthUser | null) {
  return Boolean(user?.hasProvider);
}

function navItems(providerMode: boolean) {
  return [
    { label: "作品", href: "/works" },
    { label: "面料", href: "/fabrics" },
    { label: "服务商", href: "/providers" },
    { label: "业务机会", href: "/providers/opportunities" },
    providerMode ? { label: "服务商工作台", href: "/provider-center", primary: true } : { label: "发布作品", href: "/publish", primary: true }
  ];
}

export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { user?: AuthUser | null } | null;
        if (active) setUser(response.ok ? data?.user ?? null : null);
      } finally {
        if (active) setReady(true);
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (!isCoveredRoute(pathname) || !ready) return null;

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  const providerMode = isProviderUser(user);
  const items = navItems(providerMode);

  return (
    <>
      <nav className="sticky top-0 z-40 hidden border-b border-black/8 bg-white/92 px-6 py-3 text-sm font-semibold text-ink shadow-[0_12px_34px_rgba(16,16,16,0.04)] backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link href="/" className="text-base font-semibold">
            RunwayLab
          </Link>
          <div className="flex items-center gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${item.primary ? "bg-ink text-white" : active ? "bg-paper text-ink" : "text-ink/55 hover:bg-paper hover:text-ink"} rounded-full px-4 py-2 transition`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              providerMode ? (
                <details className="group relative">
                  <summary className="list-none rounded-full px-3 py-2 transition hover:bg-paper [&::-webkit-details-marker]:hidden">
                    {user.nickname || "账号"}
                  </summary>
                  <div className="absolute right-0 mt-2 grid min-w-40 gap-1 rounded-[12px] border border-black/8 bg-white p-2 shadow-[0_18px_50px_rgba(16,16,16,0.10)]">
                    <Link href="/me/profile" className="rounded-[8px] px-3 py-2 text-ink/65 hover:bg-paper hover:text-ink">
                      账号与登录
                    </Link>
                    {user.role === "ADMIN" ? (
                      <Link href="/admin" className="rounded-[8px] px-3 py-2 text-ink/65 hover:bg-paper hover:text-ink">
                        管理后台
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={logout}
                      disabled={loggingOut}
                      className="rounded-[8px] px-3 py-2 text-left text-ink/50 hover:bg-paper hover:text-ink disabled:opacity-50"
                    >
                      退出登录
                    </button>
                  </div>
                </details>
              ) : (
                <>
                  <Link href="/me" className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink">
                    我的
                  </Link>
                  <details className="group relative">
                    <summary className="list-none rounded-full px-3 py-2 transition hover:bg-paper [&::-webkit-details-marker]:hidden">账号</summary>
                    <div className="absolute right-0 mt-2 grid min-w-40 gap-1 rounded-[12px] border border-black/8 bg-white p-2 shadow-[0_18px_50px_rgba(16,16,16,0.10)]">
                      <Link href="/me/dashboard" className="rounded-[8px] px-3 py-2 text-ink/65 hover:bg-paper hover:text-ink">
                        个人工作台
                      </Link>
                      <Link href="/me/profile" className="rounded-[8px] px-3 py-2 text-ink/65 hover:bg-paper hover:text-ink">
                        账号设置
                      </Link>
                      {user.role === "ADMIN" ? (
                        <Link href="/admin" className="rounded-[8px] px-3 py-2 text-ink/65 hover:bg-paper hover:text-ink">
                          管理后台
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={logout}
                        disabled={loggingOut}
                        className="rounded-[8px] px-3 py-2 text-left text-ink/50 hover:bg-paper hover:text-ink disabled:opacity-50"
                      >
                        退出登录
                      </button>
                    </div>
                  </details>
                </>
              )
            ) : (
              <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-white">
                登录
              </Link>
            )}
          </div>
        </div>
      </nav>
      <nav className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 text-xs font-semibold text-ink shadow-[0_12px_34px_rgba(16,16,16,0.10)] backdrop-blur md:hidden">
        {user ? (
          <>
            <Link href={providerMode ? "/provider-center" : "/me"} className="rounded-full px-3 py-2 transition hover:bg-paper">
              {providerMode ? "工作台" : "我的"}
            </Link>
            <button type="button" onClick={logout} disabled={loggingOut} className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink disabled:opacity-50">
              退出
            </button>
          </>
        ) : (
          <Link href="/login" className="rounded-full px-3 py-2 transition hover:bg-paper">
            登录
          </Link>
        )}
      </nav>
    </>
  );
}
