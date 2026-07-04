type PageShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
};

export function PageShell({ title, eyebrow = "RunwayLab V1.0", description }: PageShellProps) {
  return (
    <section className="mx-auto flex min-h-[62dvh] max-w-5xl flex-col justify-center px-4 py-8 md:min-h-[70dvh] md:px-6 md:py-12">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 md:mb-3 md:text-xs">{eyebrow}</p>
      <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-6xl">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/65 md:mt-5 md:text-base md:leading-7">{description}</p> : null}
    </section>
  );
}
