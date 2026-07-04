"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { mobileNavItems } from "@/types/navigation";

export function BottomTabBar() {
  const pathname = usePathname();

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
                  "flex items-center justify-center rounded-full transition",
                  publish ? "size-10 -translate-y-1 bg-ink text-white shadow-[0_10px_28px_rgba(16,16,16,0.24)]" : active ? "size-8 bg-accent text-ink" : "size-8 bg-transparent"
                )}
              >
                <Icon size={publish ? 20 : 18} strokeWidth={active || publish ? 2.4 : 1.9} />
              </span>
              <span className={clsx(active && "text-ink", publish && "text-ink")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
