"use client";

import { useId, useRef, useState } from "react";

type LifecycleActionButtonProps = {
  label: string;
  title: string;
  description: string;
  consequence: string;
  confirmLabel: string;
  variant?: "secondary" | "destructive" | "primary";
  disabled?: boolean;
  disabledReason?: string;
};

const variantClasses = {
  primary: "bg-ink text-white",
  secondary: "border border-black/10 bg-white text-ink",
  destructive: "border border-red-200 bg-red-50 text-red-700"
};

export function LifecycleActionButton({
  label,
  title,
  description,
  consequence,
  confirmLabel,
  variant = "secondary",
  disabled = false,
  disabledReason
}: LifecycleActionButtonProps) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-describedby={disabled && disabledReason ? `${dialogId}-disabled` : undefined}
        disabled={disabled || submitting}
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-paper disabled:text-ink/35 ${variantClasses[variant]}`}
      >
        {submitting ? "\u5904\u7406\u4e2d" : label}
      </button>
      {disabled && disabledReason ? <span id={`${dialogId}-disabled`} className="sr-only">{disabledReason}</span> : null}
      <dialog ref={dialogRef} className="w-[min(92vw,440px)] rounded-[8px] border border-black/10 bg-white p-0 text-ink shadow-[0_24px_70px_rgba(16,16,16,0.22)] backdrop:bg-black/30">
        <div className="p-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-ink/62">{description}</p>
          <p className="mt-3 rounded-[6px] bg-paper p-3 text-sm leading-6 text-ink/58">{consequence}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="h-10 rounded-full border border-black/10 px-4 text-sm font-semibold text-ink">
              {"\u53d6\u6d88"}
            </button>
            <button
              type="button"
              onClick={(event) => {
                setSubmitting(true);
                dialogRef.current?.close();
                event.currentTarget.form?.requestSubmit();
              }}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${variant === "destructive" ? "bg-red-600 text-white" : "bg-ink text-white"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
