"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  nickname: string;
  email?: string | null;
  displayName?: string | null;
  providerName?: string | null;
  maskedAccount?: string | null;
  role: string;
  status: string;
  persona?: string | null;
  personaCompleted?: boolean;
  hasProvider?: boolean;
};

const coveredRoutes = [
  "/",
  "/start",
  "/works",
  "/publish",
  "/me",
  "/provider-center",
  "/incubation",
  "/presale",
  "/projects",
  "/cases",
  "/verify",
  "/notifications",
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

function navItems(providerMode: boolean): Array<{ label: string; href: string; primary?: boolean }> {
  const shared = [
    { label: "发现", href: "/works" },
    { label: "项目", href: "/projects" },
    { label: "服务商", href: "/providers" }
  ];
  return providerMode
    ? [...shared, { label: "服务商工作台", href: "/provider-center", primary: true }]
    : [...shared, { label: "发布作品", href: "/publish", primary: true }];
}

export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnreadCount(0);
      return () => {
        active = false;
      };
    }

    async function loadUnreadCount() {
      const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      if (active) setUnreadCount(response.ok && typeof data?.count === "number" ? data.count : 0);
    }

    loadUnreadCount().catch(() => {
      if (active) setUnreadCount(0);
    });
    return () => {
      active = false;
    };
  }, [pathname, user?.id]);

  if (!isCoveredRoute(pathname) || !ready) return null;

  async function logout() {
    if (loggingOut) return;
    setLogoutError("");
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout request failed");
      }
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      setLogoutError("退出失败，请稍后再试。");
    }
  }

  const providerMode = isProviderUser(user);
  const items = navItems(providerMode);
  const accountLabel = user?.displayName || user?.providerName || user?.maskedAccount || "账号";
  const logoutLabel = loggingOut ? "退出中…" : "退出登录";
  const menuItemClass = "rounded-[8px] px-3 py-2 text-left text-ink/70 transition hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:text-ink/35 disabled:opacity-60";
  const logoutFeedback = logoutError ? <p className="px-3 py-1 text-xs leading-5 text-red-600" aria-live="polite">{logoutError}</p> : null;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const notificationLink = user ? (
    <Link
      href="/notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink/55 transition hover:bg-paper hover:text-ink"
      aria-label={unreadCount > 0 ? `消息中心，${unreadLabel} 条未读` : "消息中心"}
      title="消息中心"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-ink px-1.5 py-0.5 text-center text-[10px] font-semibold leading-4 text-white">
          {unreadLabel}
        </span>
      ) : null}
    </Link>
  ) : null;

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
                <>
                  {notificationLink}
                  <details className="group relative">
                    <summary className="list-none rounded-full px-3 py-2 transition hover:bg-paper [&::-webkit-details-marker]:hidden">
                      {accountLabel}
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
                        className={menuItemClass}
                      >
                        {logoutLabel}
                      </button>
                      {logoutFeedback}
                    </div>
                  </details>
                </>
              ) : (
                <>
                  {notificationLink}
                  <Link href="/me" className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink">
                    我的工作台
                  </Link>
                  <details className="group relative">
                    <summary className="list-none rounded-full px-3 py-2 transition hover:bg-paper [&::-webkit-details-marker]:hidden">{accountLabel}</summary>
                    <div className="absolute right-0 mt-2 grid min-w-40 gap-1 rounded-[12px] border border-black/8 bg-white p-2 shadow-[0_18px_50px_rgba(16,16,16,0.10)]">
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
                        className={menuItemClass}
                      >
                        {logoutLabel}
                      </button>
                      {logoutFeedback}
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
            <Link href="/notifications" className="relative rounded-full px-3 py-2 transition hover:bg-paper" aria-label={unreadCount > 0 ? `消息中心，${unreadLabel} 条未读` : "消息中心"}>
              消息
              {unreadCount > 0 ? <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] leading-4 text-white">{unreadLabel}</span> : null}
            </Link>
            <Link href={providerMode ? "/provider-center" : "/me"} className="rounded-full px-3 py-2 transition hover:bg-paper">
              "工作台"
            </Link>
            <button type="button" onClick={logout} disabled={loggingOut} className="rounded-full px-3 py-2 text-ink/70 transition hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:text-ink/35 disabled:opacity-60">
              {loggingOut ? "退出中…" : "退出"}
            </button>
            {logoutError ? <span className="sr-only" aria-live="polite">{logoutError}</span> : null}
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
