import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-4 py-16 text-ink md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/35">404</p>
      <h1 className="mt-4 text-3xl font-semibold md:text-5xl">页面没有找到</h1>
      <p className="mt-4 text-sm leading-6 text-ink/58">
        这个链接可能已经失效，或页面暂时不可访问。你可以回到首页，继续浏览作品和供应链资源。
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
          返回首页
        </Link>
        <Link href="/works" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
          浏览作品
        </Link>
        <Link href="/providers" className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-ink">
          浏览供应链
        </Link>
      </div>
    </main>
  );
}
