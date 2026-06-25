type PageShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
};

export function PageShell({ title, eyebrow = "RunwayLab V1.0", description }: PageShellProps) {
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-5xl flex-col justify-center px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">{eyebrow}</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-6xl">{title}</h1>
      {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-ink/65">{description}</p> : null}
    </section>
  );
}
