"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { mobileNavItems } from "@/types/navigation";

export function BottomTabBar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { count?: number } | null;
      if (active) {
        setUnreadCount(response.ok && typeof data?.count === "number" ? data.count : 0);
      }
    }

    loadUnreadCount().catch(() => {
      if (active) setUnreadCount(0);
    });

    return () => {
      active = false;
    };
  }, [pathname]);
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_44px_rgba(16,16,16,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const publish = item.href === "/publish";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 rounded-[6px] text-[10px] font-semibold transition",
                active ? "text-ink" : "text-ink/42"
              )}
            >
              <span
                className={clsx(
                  "relative flex items-center justify-center rounded-full transition",
                  publish ? "size-10 -translate-y-1 bg-ink text-white shadow-[0_10px_28px_rgba(16,16,16,0.24)]" : active ? "size-8 bg-accent text-ink" : "size-8 bg-transparent"
                )}
              >
                <Icon size={publish ? 20 : 18} strokeWidth={active || publish ? 2.4 : 1.9} />
                {item.href === "/me" && unreadCount > 0 ? (
                  <span
                    aria-label={`${unreadLabel} 条未读消息`}
                    className="absolute -right-2 -top-1 min-w-5 rounded-full bg-ink px-1.5 py-0.5 text-center text-[9px] font-semibold leading-4 text-white"
                  >
                    {unreadLabel}
                  </span>
                ) : null}
              </span>
              <span className={clsx(active && "text-ink", publish && "text-ink")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
