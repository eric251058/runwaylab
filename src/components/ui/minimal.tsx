import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/35">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

type PrimaryActionProps = {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
};

export function PrimaryAction({ href, children, secondary = false, className = "" }: PrimaryActionProps) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition sm:w-auto ${
        secondary ? "border border-black/10 bg-white text-ink hover:border-ink/35" : "bg-ink text-white hover:bg-black"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-black/15 bg-white px-5 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/52">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div>;
}

export function SuccessNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-[8px] border border-black/8 bg-white px-4 py-3 text-sm text-ink/62">{children}</div>;
}

export function StatusBadge({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${strong ? "bg-ink text-white" : "bg-paper text-ink/55"}`}>
      {children}
    </span>
  );
}

export function SectionDisclosure({
  title,
  description,
  children,
  defaultOpen = false
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="rounded-[8px] border border-black/8 bg-white p-4 md:p-5">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-4">
          <span>
            {title}
            {description ? <span className="mt-1 block text-xs font-medium leading-5 text-ink/45">{description}</span> : null}
          </span>
          <span className="shrink-0 text-xs text-ink/40">展开</span>
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
