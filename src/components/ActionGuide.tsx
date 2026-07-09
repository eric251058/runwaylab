import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type ActionGuideAction = {
  label: string;
  href: string;
  primary?: boolean;
};

type ActionGuideProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  note?: ReactNode;
  actions?: ActionGuideAction[];
};

export function ActionGuide({ eyebrow, title, description, note, actions = [] }: ActionGuideProps) {
  return (
    <section className="rounded-[8px] border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(16,16,16,0.08)] md:p-6">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/35">{eyebrow}</p> : null}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight text-ink md:text-3xl">{title}</h2>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/58">{description}</p> : null}
          {note ? <div className="mt-3 text-sm leading-6 text-ink/55">{note}</div> : null}
        </div>
        {actions.length ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={`inline-flex h-11 w-full items-center justify-center gap-1 rounded-full px-5 text-sm font-semibold sm:w-auto ${
                  action.primary ? "bg-ink text-white" : "border border-black/10 bg-white text-ink"
                }`}
              >
                {action.label}
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
