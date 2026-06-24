export function DataUnavailable({ title = "数据暂时没有读到" }: { title?: string }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">RunwayLab</p>
      <h1 className="mt-4 text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-ink/55">请确认当前环境的 PostgreSQL 连接可用，然后刷新页面。</p>
    </div>
  );
}
