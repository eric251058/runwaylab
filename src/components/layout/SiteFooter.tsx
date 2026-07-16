import Link from "next/link";
import { ICP_NUMBER, ICP_URL, SITE_NAME } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-white px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 text-xs text-ink/40 md:px-8 md:pb-6 md:pt-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-semibold text-ink/55">{SITE_NAME}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            <Link href="/legal/terms" className="hover:text-ink/65">平台规则</Link>
            <Link href="/legal/privacy" className="hover:text-ink/65">隐私政策</Link>
            <Link href="/legal/copyright" className="hover:text-ink/65">版权规则</Link>
            <Link href="/legal/presale-rules" className="hover:text-ink/65">预售规则</Link>
            <Link href="/legal/collaboration-rules" className="hover:text-ink/65">合作规则</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
          <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          <a
            href={ICP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-ink/65"
          >
            {ICP_NUMBER}
          </a>
        </div>
      </div>
    </footer>
  );
}
