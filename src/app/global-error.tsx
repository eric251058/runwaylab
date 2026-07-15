"use client";

import Link from "next/link";

export default function GlobalErrorPage({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-16 font-sans text-ink md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/35">ERROR</p>
          <h1 className="mt-4 text-3xl font-semibold md:text-5xl">页面暂时不可用</h1>
          <p className="mt-4 text-sm leading-6 text-black/60">
            系统遇到临时问题，未展示任何内部错误信息。请刷新重试，或返回首页继续浏览。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={reset} className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white">
              重新加载
            </button>
            <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-black">
              返回首页
            </Link>
            <Link href="/providers" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-black">
              浏览供应链
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
