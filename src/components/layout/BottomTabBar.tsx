import Link from "next/link";
import { mobileNavItems } from "@/types/navigation";

export function BottomTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {mobileNavItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center justify-center text-sm font-medium text-ink/75">
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
