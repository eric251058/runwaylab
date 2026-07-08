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

const coveredRoutes = ["/", "/works", "/publish", "/me", "/incubation", "/presale", "/challenges", "/designers", "/schools", "/teachers", "/exhibitions", "/providers", "/fabrics"];

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
    <nav className="fixed right-3 top-3 z-40 flex items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 text-xs font-semibold text-ink shadow-[0_12px_34px_rgba(16,16,16,0.10)] backdrop-blur md:right-6 md:top-5 md:text-sm">
      {user ? (
        <>
          <Link href="/me/onboarding" className="hidden rounded-full bg-paper px-3 py-2 text-ink/60 transition hover:text-ink sm:inline-flex md:px-4">
            {user.personaCompleted ? `身份：${personaLabels[user.persona ?? ""] ?? "未选择"}` : "选择身份"}
          </Link>
          <Link href="/me" className="rounded-full px-3 py-2 transition hover:bg-paper md:px-4">
            我的
          </Link>
          <Link href="/publish" className="rounded-full px-3 py-2 transition hover:bg-paper md:px-4">
            投稿
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-full px-3 py-2 text-ink/55 transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 md:px-4"
          >
            退出
          </button>
        </>
      ) : (
        <Link href="/login" className="rounded-full px-3 py-2 transition hover:bg-paper md:px-4">
          登录 / 注册
        </Link>
      )}
    </nav>
  );
}
