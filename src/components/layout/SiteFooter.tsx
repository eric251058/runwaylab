import Link from "next/link";
import { ICP_NUMBER, ICP_URL, SITE_NAME } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-white px-4 pb-24 pt-6 text-xs text-ink/40 md:px-8 md:pb-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-semibold text-ink/55">{SITE_NAME}</p>
          <p className="mt-1 max-w-xl leading-5">连接设计作品、AI 诊断与供应链协作，帮助服装设计从创意走向打样与生产。</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            <Link href="/works" className="hover:text-ink/65">作品</Link>
            <Link href="/providers" className="hover:text-ink/65">供应链</Link>
            <Link href="/schools" className="hover:text-ink/65">学校</Link>
            <Link href="/legal/terms" className="hover:text-ink/65">平台规则</Link>
            <Link href="/legal/privacy" className="hover:text-ink/65">隐私政策</Link>
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
