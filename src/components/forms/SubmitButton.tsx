"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingText?: string;
  className?: string;
};

export function SubmitButton({ children, pendingText = "正在保存...", className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"}
    >
      {pending ? pendingText : children}
    </button>
  );
}
