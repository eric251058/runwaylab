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
};

const coveredRoutes = ["/", "/works", "/publish", "/me", "/provider-center", "/incubation", "/presale", "/projects", "/cases", "/verify", "/legal", "/challenges", "/designers", "/schools", "/teachers", "/exhibitions", "/providers", "/fabrics", "/batches"];

const desktopNavItems = [
  { label: "作品", href: "/works" },
  { label: "供应链", href: "/providers" },
  { label: "孵化", href: "/incubation" },
  { label: "学校与挑战", href: "/schools" },
  { label: "发布作品", href: "/publish", primary: true }
];

const personaLabels: Record<string, string> = {
  DESIGNER: "设计师",
  FABRIC_SUPPLIER: "面料商",
  SAMPLE_STUDIO: "打样",
  FACTORY: "工厂",
  BUYER: "买手",
  CONSUMER: "普通用户",
  TEACHER: "老师",
  SCHOOL: "学校",
  OTHER: "其他"
};

function isCoveredRoute(pathname: string) {
  return coveredRoutes.some((route) => (route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`)));
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

        if (active) {
          setUser(response.ok ? data?.user ?? null : null);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (!isCoveredRoute(pathname) || !ready) {
    return null;
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav className="sticky top-0 z-40 hidden border-b border-black/8 bg-white/92 px-6 py-3 text-sm font-semibold text-ink shadow-[0_12px_34px_rgba(16,16,16,0.04)] backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link href="/" className="text-base font-semibold">RunwayLab</Link>
          <div className="flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <>
                {user.personaCompleted ? <span className="rounded-full bg-paper px-3 py-2 text-xs text-ink/55">身份：{personaLabels[user.persona ?? ""] ?? "未选择"}</span> : null}
                <Link href="/provider-center" className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink">供应商中心</Link>
                {user.role === "ADMIN" ? <Link href="/admin" className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink">管理后台</Link> : null}
                <Link href="/me" className="rounded-full px-3 py-2 transition hover:bg-paper">我的</Link>
                <button type="button" onClick={logout} disabled={loggingOut} className="rounded-full px-3 py-2 text-ink/50 transition hover:bg-paper hover:text-ink disabled:opacity-50">退出</button>
              </>
            ) : (
              <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-white">登录</Link>
            )}
          </div>
        </div>
      </nav>
      <nav className="fixed right-3 top-3 z-40 flex items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 text-xs font-semibold text-ink shadow-[0_12px_34px_rgba(16,16,16,0.10)] backdrop-blur md:hidden">
        {user ? (
          <>
            <Link href="/me" className="rounded-full px-3 py-2 transition hover:bg-paper">我的</Link>
            <button type="button" onClick={logout} disabled={loggingOut} className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink disabled:opacity-50">退出</button>
          </>
        ) : (
          <Link href="/login" className="rounded-full px-3 py-2 transition hover:bg-paper">登录</Link>
        )}
      </nav>
    </>
  );
}
